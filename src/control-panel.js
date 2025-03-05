const State = Object.freeze({
    Idle: 0,
    CreatePoints: 1,
    PolygonDrawn: 2,
    ChooseFirstPoint: 3,
    ChooseSecondPoint: 4,
    PathReady: 5,
});

class ControlPanel extends HTMLElement {
    state = State.Idle;
    pointsCount = 0;
    clockwise = true;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    async connectedCallback() {
        await this.render();

        this.initializeElementLinks();
        this.initializeListeners();

        this.loadDataFromLocalStorage();
    }

    async render() {
        const css = await fetch('./styles/control-panel.css').then(res => res.text());
        const html = await fetch('./views/control-panel.html').then(res => res.text());

        const style = document.createElement('style');
        style.textContent = css;

        this.shadowRoot.innerHTML = html;

        this.shadowRoot.appendChild(style);
    }

    initializeElementLinks() {
        this.createPointsButton = this.shadowRoot.getElementById('create-points');
        this.drawPolygonButton = this.shadowRoot.getElementById('draw-polygon');
        this.firstPointButton = this.shadowRoot.getElementById('first-point');
        this.secondPointButton = this.shadowRoot.getElementById('second-point');
        this.clockwiseOrderButton = this.shadowRoot.getElementById('clockwise-order');
        this.clearButton = this.shadowRoot.getElementById('clear');
        this.createPointsHintElement = this.shadowRoot.querySelector('.create-points-hint');
        this.firstPointHintElement = this.shadowRoot.querySelector('.first-point-hint');
        this.secondPointHintElement = this.shadowRoot.querySelector('.second-point-hint');
        this.pathElement = this.shadowRoot.querySelector('.path');
    }

    initializeListeners() {
        this.createPointsButton.addEventListener('click', () => this.handleButtonClick('create-points', State.CreatePoints));

        this.drawPolygonButton.addEventListener('click', () => this.handleButtonClick('draw-polygon', State.PolygonDrawn));

        this.firstPointButton.addEventListener('click', () => this.handleButtonClick('path-point', State.ChooseFirstPoint));

        this.secondPointButton.addEventListener('click', () => this.handleButtonClick('path-point', State.ChooseSecondPoint));

        this.clockwiseOrderButton.addEventListener('click', () => this.handleClockwiseButtonClick());

        this.clearButton.addEventListener('click', () => this.handleClearButtonClick());

        window.addEventListener('add-point', (event) => {
            this.pointsCount = event.detail.points;

            this.handlePointsChange();
        });

        window.addEventListener('path-changed', (event) => this.handlePathChanged(event.detail));

        window.addEventListener('path-built', (event) => this.handlepathPoints(event.detail.pathPoints));
    }

    handlepathPoints(pathPoints) {        
        this.pathElement.innerHTML = pathPoints.map((index) => `p${index + 1}`).join(' - ');
    }

    handleClockwiseButtonClick() {
        this.clockwise = !this.clockwise;

        this.clockwiseOrderButton.innerHTML = this.clockwise ? `Clockwise order` : 'Counterclockwise order';

        this.dispatch('clockwise-order', { clockwise: this.clockwise });
    }

    handleClearButtonClick() {
        this.clockwise = true;
        this.pointsCount = 0;

        this.clockwiseOrderButton.innerHTML = `Clockwise order`;
        this.firstPointHintElement.innerHTML = '';
        this.secondPointHintElement.innerHTML = '';
        this.pathElement.innerHTML = '';
        this.handlePointsChange();

        this.handleButtonClick('clear', State.Idle);
    }

    handlePathChanged(path) {        
        const { firstPointIndex, secondPointIndex } = path;
        
        this.firstPointHintElement.innerHTML = firstPointIndex === null ? '' : `p${firstPointIndex + 1}`;
        this.secondPointHintElement.innerHTML = secondPointIndex === null ? '' : `p${secondPointIndex + 1}`;

        this.state = firstPointIndex !== null && secondPointIndex !== null ? State.PathReady : State.PolygonDrawn;
        this.updateDisabledState();

        this.firstPointIndex = firstPointIndex;
        this.secondPointIndex = secondPointIndex;
    }

    handlePointsChange() {
        if (this.pointsCount < 3 || this.pointsCount > 15) {
            if (!this.createPointsHintElement.classList.contains('create-points-hint--invalid')) {
                this.createPointsHintElement.classList.add('create-points-hint--invalid');
                this.createPointsHintElement.classList.remove('create-points-hint--valid');
            }
        } else {
            if (!this.createPointsHintElement.classList.contains('create-points-hint--valid')) {
                this.createPointsHintElement.classList.add('create-points-hint--valid');
                this.createPointsHintElement.classList.remove('create-points-hint--invalid');
            }
        }

        this.createPointsHintElement.innerHTML = `Created ${this.pointsCount} points`;

        this.updateDisabledState();
    }

    handleButtonClick(eventName, newState) {
        this.state = newState;

        this.dispatch(eventName);

        this.updateDisabledState();
    }

    dispatch(eventName, data = {}) {
        const event = new CustomEvent(eventName, {
            detail: { state: this.state, ...data },
            bubbles: true,
            composed: true
        });

        window.dispatchEvent(event); 
    }

    updateDisabledState() {
        switch(this.state) {
            case State.Idle:
                this.createPointsButton.removeAttribute('disabled');
                this.drawPolygonButton.setAttribute('disabled', true);
                this.firstPointButton.setAttribute('disabled', true);
                this.secondPointButton.setAttribute('disabled', true);
                this.clockwiseOrderButton.setAttribute('disabled', true);
                this.clearButton.setAttribute('disabled', true);                
                break;
            case State.CreatePoints:
                this.createPointsButton.setAttribute('disabled', true);
                if (this.pointsCount >= 3 && this.pointsCount <= 15) {
                    this.drawPolygonButton.removeAttribute('disabled'); 
                } else {
                    this.drawPolygonButton.setAttribute('disabled', true);
                }
                this.clearButton.removeAttribute('disabled');
                break;
            case State.PolygonDrawn:
                this.clearButton.removeAttribute('disabled');
                this.drawPolygonButton.setAttribute('disabled', true);
                this.firstPointButton.removeAttribute('disabled');
                this.secondPointButton.removeAttribute('disabled');
                break;
            case State.ChooseFirstPoint:
                this.clearButton.setAttribute('disabled', true);
                this.firstPointButton.setAttribute('disabled', true);
                this.secondPointButton.setAttribute('disabled', true);
                break;
            case State.ChooseSecondPoint:
                this.drawPolygonButton.setAttribute('disabled', true);
                this.firstPointButton.setAttribute('disabled', true);
                this.secondPointButton.setAttribute('disabled', true);
                break;
            case State.PathReady:
                this.drawPolygonButton.setAttribute('disabled', true);
                this.createPointsButton.setAttribute('disabled', true);
                this.firstPointButton.setAttribute('disabled', true);
                this.secondPointButton.setAttribute('disabled', true);
                this.clockwiseOrderButton.removeAttribute('disabled');
                this.clearButton.removeAttribute('disabled');
                break;
            default:
                throw new Error('Unreachable statement');
        }

    }

    loadDataFromLocalStorage() {
        const savedData = (() => {
            try {
                return JSON.parse(localStorage.getItem('canvas'));
            } catch (error) {
                return null;
            }
        })();

        if (savedData === undefined || savedData === null) {
            return;
        }

        this.pointsCount = savedData.points.length;
        this.clockwise = savedData.clockwise;
        this.state = State.PathReady;

        this.handlePointsChange();

        this.clockwiseOrderButton.innerHTML = this.clockwise ? `Clockwise order` : 'Counterclockwise order';

        this.handlePathChanged({ firstPointIndex: savedData.firstPointIndex, secondPointIndex: savedData.secondPointIndex });

        this.handlepathPoints(savedData.pathPoints);
    }
}

customElements.define('control-panel', ControlPanel);