class PolygonApp extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    async connectedCallback() {
        const css = await fetch('./styles/polygon-app.css').then(res => res.text());
        const style = document.createElement('style');
        style.textContent = css;

        this.shadowRoot.innerHTML = `
            <div class="container">
                <polygon-canvas></polygon-canvas>
                <control-panel></control-panel>
            </div>
        `;

        this.shadowRoot.appendChild(style);
    }
}

customElements.define('polygon-app', PolygonApp);