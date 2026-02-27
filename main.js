import { CHARACTERS, CATEGORIES } from './data.js';

// Routing & View Logic
function navigate() {
    const hash = window.location.hash || '#home';
    const views = document.querySelectorAll('.view');
    const navLinks = document.querySelectorAll('.nav-link');

    // Revert hash if it's a legacy character path
    if (hash.startsWith('#char/')) {
        window.location.hash = '#characters';
        return;
    }

    views.forEach(v => v.style.display = 'none');
    navLinks.forEach(l => l.classList.remove('active'));

    const targetViewId = `view-${hash.substring(1)}`;
    const targetView = document.getElementById(targetViewId);
    
    if (targetView) {
        targetView.style.display = 'block';
    } else if (hash === '#home') {
        document.getElementById('view-home').style.display = 'block';
    } else if (hash === '#privacy') {
        document.getElementById('view-privacy').style.display = 'block';
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
        const cards = document.querySelectorAll('.character-card');
        const sections = document.querySelectorAll('.category-section');
        
        cards.forEach(card => {
            const text = card.textContent.toLowerCase();
            card.parentElement.style.display = text.includes(term) ? 'block' : 'none';
        });

        sections.forEach(section => {
            const visibleCards = section.querySelectorAll('.character-card-link[style="display: block;"]');
            section.style.display = (visibleCards.length > 0 || term === "") ? 'block' : 'none';
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
                        <a href="detail.html?id=${char.id}" target="_blank" class="character-card-link">
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

// Initial Setup
window.addEventListener('hashchange', navigate);
window.addEventListener('load', () => {
    navigate();

    const playlist = document.querySelector('.playlist');
    if (playlist) {
        playlist.querySelectorAll('li').forEach(li => {
            li.onclick = function() {
                document.querySelector('.playlist li.active').classList.remove('active');
                this.classList.add('active');
                const videoId = this.dataset.video;
                const player = document.getElementById('main-player');
                if (player) player.src = `https://www.youtube.com/embed/videoseries?list=${videoId}`;
            };
        });
    }

    const sidebar = document.getElementById('main-sidebar');
    const toggle = document.getElementById('sidebar-toggle');
    if (toggle) toggle.onclick = () => sidebar.classList.toggle('active');
});
