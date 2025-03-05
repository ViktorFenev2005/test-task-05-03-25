class PolygonCanvas extends HTMLElement {
    canvasClickListener = null;
    points = [];
    pathPoints = [];
    firstPointIndex = null;
    secondPointIndex = null;
    clockwise = true;
    choosingPathPoint = null;

    constructor() {
        super();

        this.attachShadow({ mode: 'open' });
    }

    async connectedCallback() {
        await this.render();
        this.canvas = this.shadowRoot.getElementById('workspace');
        this.pathCanvas = this.shadowRoot.getElementById('pathCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.pathCtx = this.pathCanvas.getContext('2d');
        this.ctx.font = '14px Arial';

        this.initializeListeners();

        this.loadDataFromLocalStorage();
    }

    async render() {
        const css = await fetch('./styles/polygon-canvas.css').then(res => res.text());
        
        const style = document.createElement('style');
        style.textContent = css;

        this.shadowRoot.innerHTML = `
            <canvas id="workspace" width="500" height="500"></canvas>
            <canvas id="pathCanvas" width="500" height="500"></canvas>
        `;

        this.shadowRoot.appendChild(style);
    }

    onCanvasMouseMove(event) {
        const mouseX = event.clientX - this.canvas.offsetLeft;
        const mouseY = event.clientY - this.canvas.offsetTop;

        for (let i = 0; i < this.points.length; i++) {
            const point = this.points[i];
            const distance = Math.sqrt(Math.pow(mouseX - point.x, 2) + Math.pow(mouseY - point.y, 2));

            if (distance < 5) {  // Радиус точки - 5px
                this.highlightPoint(point);
                return;
            }
        }
    }

    initializeListeners() {
        window.addEventListener('create-points', () => this.handleCreatePointsEvent());

        window.addEventListener('draw-polygon', () => this.handleDrawPolygonEvent());

        window.addEventListener('clockwise-order', (event) => {
            this.clockwise = event.detail.clockwise;

            this.buildPath(this.firstPointIndex, this.secondPointIndex);
        });

        window.addEventListener('path-point', (event) => this.handleChoosePathPoint(event));

        window.addEventListener('clear', () => this.handleClearEvent());
    }

    handleCreatePointsEvent() {
        if (this.canvasClickListener !== null) {
            return;
        }

        this.rect = this.canvas.getBoundingClientRect();

        this.canvasClickListener = (event) => this.addPoint(event);
        this.canvas.addEventListener('click', this.canvasClickListener);
    }

    handleDrawPolygonEvent() {
        if (this.canvasClickListener !== null) {
            this.canvas.removeEventListener('click', this.canvasClickListener);

            this.canvasClickListener = null;
        }

        this.drawPolygon();
    }

    handleChoosePathPoint(event) {
        this.choosingPathPoint = event.detail.state;        
        
        this.pathCanvas.style.pointerEvents = 'auto';
        this.pathCanvas.addEventListener('click', this.handlePointClick.bind(this));
    }

    handlePointClick(event) {    
        if (this.choosingPathPoint === null) {
            return;
        }   

        const rect = this.canvas.getBoundingClientRect();

        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        for (let i = 0; i < this.points.length; i++) {
            const point = this.points[i];
            const distance = Math.sqrt(Math.pow(mouseX - point.x, 2) + Math.pow(mouseY - point.y, 2));
    
            if (distance < 5) {
                if (this.choosingPathPoint === 3) {
                    this.firstPointIndex = i;
                } else {
                    this.secondPointIndex = i;
                }

                this.dispatch('path-changed', { firstPointIndex: this.firstPointIndex, secondPointIndex: this.secondPointIndex })
                
                this.buildPath(this.firstPointIndex, this.secondPointIndex);

                this.choosingPathPoint = null;
                this.pathCanvas.style.pointerEvents = 'none';
                this.pathCanvas.removeEventListener('click', this.handlePointClick.bind(this));
                break;
            }
        }
    }

    buildPath(startIndex, endIndex) {
        if (startIndex === null || endIndex === null || startIndex === endIndex) return;
    
        this.pathCtx.clearRect(0, 0, this.pathCanvas.width, this.pathCanvas.height);
    
        this.pathCtx.strokeStyle = 'blue';
        this.pathCtx.lineWidth = 3;
        this.pathCtx.beginPath();
        
        this.pathCtx.moveTo(this.points[startIndex].x, this.points[startIndex].y);
    
        this.pathPoints = [];
        this.pathPoints.push(startIndex);
    
        let i = startIndex;
    
        if (this.clockwise) {
            while (i !== endIndex) {
                i = (i + 1) % this.points.length;
                this.pathCtx.lineTo(this.points[i].x, this.points[i].y);
                this.pathPoints.push(i);
            }
        } else {
            while (i !== endIndex) {
                i = (i - 1 + this.points.length) % this.points.length;
                this.pathCtx.lineTo(this.points[i].x, this.points[i].y);
                this.pathPoints.push(i);
            }
        }
    
        this.pathCtx.stroke();

        this.dispatch('path-built', { pathPoints: this.pathPoints });

        this.saveDataToLocalStorage();
    }

    handleClearEvent() {
        if (this.canvasClickListener !== null) {
            this.canvas.removeEventListener('click', this.canvasClickListener);

            this.canvasClickListener = null;
        }

        this.clearCanvas();
    }

    addPoint(event) {
        const x = event.clientX - this.rect.left;
        const y = event.clientY - this.rect.top;

        const pointNumber = this.points.push({ x, y });
        this.drawPoint(x, y, pointNumber);

        this.dispatch('add-point', { points: pointNumber });
    }

    drawPoint(x, y, pointNumber) {
        this.ctx.strokeStyle = 'black';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(x, y, 5, 0, Math.PI * 2);
        this.ctx.stroke();
        
        this.ctx.fillStyle = '#fff4c3';
        this.ctx.beginPath();
        this.ctx.arc(x, y, 5, 0, Math.PI * 2); 
        this.ctx.fill();

        this.ctx.fillText(`p${pointNumber}`, x - 5, y - 20);
    }

    drawPolygon() {
        if (this.points.length < 3 || this.points.length > 15) return;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.strokeStyle = 'black';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(this.points[0].x, this.points[0].y);

        for (let i = 1; i < this.points.length; i++) {
            this.ctx.lineTo(this.points[i].x, this.points[i].y);
        }

        this.ctx.closePath();
        this.ctx.stroke();

        for (let i = 0; i < this.points.length; i++) {
            const { x, y } = this.points[i];
            this.drawPoint(x, y, i + 1);
        }
    }

    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.pathCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.points = [];
        this.firstPointIndex = null;
        this.secondPointIndex = null;
        this.clockwise = true;
        this.choosingPathPoint = null;

        localStorage.removeItem('canvas');
    }

    dispatch(eventName, data) {
        const event = new CustomEvent(eventName, {
            detail: data,
            bubbles: true,
            composed: true
        });

        window.dispatchEvent(event); 
    }

    saveDataToLocalStorage() {
        const dataToSave = {
            points: this.points,
            pathPoints: this.pathPoints,
            firstPointIndex: this.firstPointIndex,
            secondPointIndex: this.secondPointIndex,
            clockwise: this.clockwise,
        }

        localStorage.setItem('canvas', JSON.stringify(dataToSave));
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

        this.points = savedData.points;
        this.pathPoints = savedData.pathPoints;
        this.firstPointIndex = savedData.firstPointIndex;
        this.secondPointIndex = savedData.secondPointIndex;
        this.clockwise = savedData.clockwise;

        this.drawPolygon();

        this.buildPath(this.firstPointIndex, this.secondPointIndex);
    }
}

customElements.define('polygon-canvas', PolygonCanvas);