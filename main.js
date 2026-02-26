/**
 * ThemeToggle Web Component
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
                    transition: all 0.2s;
                }
                button:hover {
                    background-color: var(--accent-color, #f0f4ff);
                    transform: rotate(15deg);
                }
                svg { width: 20px; height: 20px; }
            </style>
            <button id="toggle-btn" aria-label="테마 전환">
                ${this.isDark ? 
                    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>` : 
                    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`
                }
            </button>
        `;
        this.shadowRoot.getElementById('toggle-btn').onclick = () => this.toggle();
    }
}

customElements.define('theme-toggle', ThemeToggle);

document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('main-sidebar');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const searchInput = document.getElementById('wiki-search');

    // Sidebar Toggle
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });
    }

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 1024 && 
            !sidebar.contains(e.target) && 
            !sidebarToggle.contains(e.target) && 
            sidebar.classList.contains('active')) {
            sidebar.classList.remove('active');
        }
    });

    // Simple Search Filter (Visual only for prototype)
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const cards = document.querySelectorAll('.character-card');
            
            cards.forEach(card => {
                const name = card.getAttribute('data-name').toLowerCase();
                const title = card.querySelector('h3').textContent.toLowerCase();
                if (name.includes(term) || title.includes(term)) {
                    card.style.display = 'flex';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    }

    // Initialize Theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
    }
});
