import { CHARACTERS, CATEGORIES } from './data.js';

function navigate() {
    const hash = window.location.hash || '#home';
    const views = document.querySelectorAll('.view');
    const navLinks = document.querySelectorAll('.nav-link');

    // Hide all views first
    views.forEach(v => v.style.display = 'none');
    navLinks.forEach(l => l.classList.remove('active'));

    const targetId = `view-${hash.replace('#', '')}`;
    const targetView = document.getElementById(targetId);

    if (targetView) {
        targetView.style.display = 'block';
    } else {
        document.getElementById('view-home').style.display = 'block';
    }

    const activeLink = document.querySelector(`.nav-link[href="${hash}"]`);
    if (activeLink) activeLink.classList.add('active');

    if (hash === '#characters') {
        renderCharGrid();
        setupSearch();
    }
}

function setupSearch() {
    const searchInput = document.getElementById('wiki-search');
    if (!searchInput) return;
    searchInput.oninput = (e) => {
        const term = e.target.value.toLowerCase();
        const cards = document.querySelectorAll('.character-card-link');
        cards.forEach(card => {
            const text = card.textContent.toLowerCase();
            card.style.display = text.includes(term) ? 'block' : 'none';
        });
    };
}

function renderCharGrid() {
    const grid = document.getElementById('char-grid');
    if (!grid) return;
    grid.innerHTML = CATEGORIES.map(cat => {
        const catChars = CHARACTERS.filter(c => c.category === cat);
        if (catChars.length === 0) return '';
        return `
            <div class="category-section">
                <h2 class="category-title">${cat}</h2>
                <div class="category-grid">
                    ${catChars.map(char => `
                        <a href="detail.html#${char.id}" target="_blank" class="character-card-link">
                            <div class="character-card">
                                <div class="card-img-wrap"><img src="${char.image}" alt="${char.name}"></div>
                                <div class="card-info">
                                    <h3>${char.name}</h3>
                                    <p>${char.title}</p>
                                </div>
                            </div>
                        </a>
                    `).join('')}
                </div>
            </div>
        `;
    }).join('');
}

window.addEventListener('hashchange', navigate);
window.addEventListener('DOMContentLoaded', () => {
    navigate();
    
    // Sidebar toggle
    const toggle = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('main-sidebar');
    if (toggle && sidebar) {
        toggle.onclick = () => sidebar.classList.toggle('active');
    }

    // Video Playlist
    const playlistItems = document.querySelectorAll('.playlist li');
    playlistItems.forEach(li => {
        li.onclick = function() {
            document.querySelector('.playlist li.active')?.classList.remove('active');
            this.classList.add('active');
            const videoId = this.dataset.video;
            const player = document.getElementById('main-player');
            if (player) player.src = `https://www.youtube.com/embed/videoseries?list=${videoId}`;
        };
    });
});
