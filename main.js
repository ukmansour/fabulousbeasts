/**
 * WikiInfobox Web Component
 * Displays a right-aligned card for quick facts about a topic.
 */
class WikiInfobox extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.render();
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    float: right;
                    width: 300px;
                    margin-left: 1.5rem;
                    margin-bottom: 1.5rem;
                    border: 1px solid var(--border-color, #eaecf0);
                    border-radius: 8px;
                    background-color: var(--sidebar-bg, #f8f9fa);
                    overflow: hidden;
                    font-size: 0.875rem;
                }

                @media (max-width: 768px) {
                    :host {
                        float: none;
                        width: 100%;
                        margin-left: 0;
                    }
                }

                .title {
                    background-color: var(--primary-color, #3667ff);
                    color: white;
                    padding: 0.75rem;
                    text-align: center;
                    font-weight: 700;
                    font-size: 1.1rem;
                }

                .image-container {
                    padding: 1rem;
                    text-align: center;
                    background-color: white;
                }

                ::slotted(img) {
                    max-width: 100%;
                    height: auto;
                    border-radius: 4px;
                }

                .stats {
                    padding: 0.5rem;
                }

                ::slotted(.stat-row) {
                    display: flex;
                    justify-content: space-between;
                    padding: 0.5rem;
                    border-bottom: 1px solid var(--border-color, #eaecf0);
                }

                ::slotted(.stat-row:last-child) {
                    border-bottom: none;
                }
            </style>
            <div class="infobox">
                <div class="title"><slot name="title">제목 없음</slot></div>
                <div class="image-container"><slot name="image"></slot></div>
                <div class="stats"><slot name="stats"></slot></div>
            </div>
        `;
    }
}

/**
 * ThemeToggle Web Component
 * Handles switching between light and dark modes.
 */
class ThemeToggle extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.isDark = document.body.classList.contains('dark-mode');
    }

    connectedCallback() {
        this.render();
    }

    toggle() {
        this.isDark = !this.isDark;
        document.body.classList.toggle('dark-mode', this.isDark);
        localStorage.setItem('theme', this.isDark ? 'dark' : 'light');
        this.render();
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                button {
                    background: none;
                    border: 1px solid var(--border-color, #eaecf0);
                    color: var(--text-color, #1a1a1b);
                    padding: 0.5rem;
                    border-radius: 50%;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 40px;
                    height: 40px;
                    transition: background-color 0.2s;
                }
                button:hover {
                    background-color: var(--accent-color, #f0f4ff);
                }
                svg { width: 20px; height: 20px; }
            </style>
            <button id="toggle-btn" aria-label="Toggle Theme">
                ${this.isDark ? 
                    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>` : 
                    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`
                }
            </button>
        `;
        this.shadowRoot.getElementById('toggle-btn').onclick = () => this.toggle();
    }
}

// Register Components
customElements.define('wiki-infobox', WikiInfobox);
customElements.define('theme-toggle', ThemeToggle);

// Global Interactivity
document.addEventListener('DOMContentLoaded', () => {
    // Sidebar Toggle for Mobile
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('main-sidebar');

    if (sidebarToggle && sidebar) {
        sidebarToggle.onclick = () => {
            sidebar.classList.toggle('active');
        };
    }

    // Restore Theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
    }
});
