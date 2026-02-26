const CHARACTERS = [
    {
        id: 'tianlu',
        name: '티엔루 (Tianlu)',
        kName: '티엔루',
        title: '행운을 가져다주는 벽사',
        desc: '금품을 먹는 어린 벽사. 항상 배고파하며 행운을 가져다준다고 믿어집니다.',
        image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSfI_E8-M4H4nS_8KzXQjI-S_W_jX-S_W_jX-S_W_jX-S_W_jX',
        lore: '고대 신화 속의 벽사(Pi Xiu)로, 현대 사회에서 닉(Nick)과 시부샹과 함께 살고 있습니다. 먹을 것을 매우 좋아하며, 특히 금속이나 보석을 좋아합니다.',
        personality: '천진난만하고 낙천적입니다. 가끔 사고를 치기도 하지만 미워할 수 없는 매력을 가졌습니다.'
    },
    {
        id: 'sibuxiang',
        name: '시부샹 (Sibuxiang)',
        kName: '시부샹',
        title: '루렌디엔 유물 가게 주인',
        desc: '"루렌디엔" 유물 가게의 주인. 다른 이들을 돕기 위해 지상으로 내려온 상서로운 짐승입니다.',
        image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR_Dq5Ym_N0f3D_x_B_m_B_m_B_m_B_m_B_m_B_m_B_m_B',
        lore: '기린의 첫째 아들로, 매우 강력한 신통력을 가지고 있습니다. 하지만 지상에서는 평범한(?) 가게 주인으로 살아가고 있습니다.',
        personality: '침착하고 현명하며, 주변 사람들을 잘 챙깁니다. 하지만 가끔 엄격한 면도 보여줍니다.'
    },
    {
        id: 'tony',
        name: '토니 (Tony)',
        kName: '토니',
        title: '부유한 기업가 달토끼',
        desc: '달토끼이자 부유한 기업가. 시부샹의 마음을 얻기 위해 노력합니다.',
        image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT_E_E_E_E_E_E_E_E_E_E_E_E_E_E_E_E_E_E_E_E',
        lore: '달에서 온 토끼로, 지상에서 큰 성공을 거둔 사업가입니다. 시부샹을 짝사랑하며 항상 그에게 구애를 합니다.',
        personality: '자신감이 넘치고 화려한 것을 좋아합니다. 목표를 위해 아낌없이 투자하는 성격입니다.'
    }
];

class ThemeToggle extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }
    connectedCallback() { this.render(); }
    toggle() {
        const isDark = document.body.classList.toggle('dark-mode');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        this.render();
    }
    render() {
        const isDark = document.body.classList.contains('dark-mode');
        this.shadowRoot.innerHTML = `
            <style>
                button { background: none; border: 1px solid var(--border-color, #ccc); color: var(--text-color, #000); padding: 0.5rem; border-radius: 50%; cursor: pointer; display: flex; align-items: center; width: 40px; height: 40px; transition: 0.2s; }
                button:hover { background: var(--accent-color, #eee); }
                svg { width: 20px; height: 20px; }
            </style>
            <button onclick="this.getRootNode().host.toggle()">
                ${isDark ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>' : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>'}
            </button>
        `;
    }
}
customElements.define('theme-toggle', ThemeToggle);

class CharacterModal extends HTMLElement {
    constructor() {
        super();
        this.innerHTML = `
            <div class="modal-backdrop" id="modal-backdrop">
                <div class="modal-window">
                    <button class="modal-close" id="modal-close">&times;</button>
                    <div class="modal-content" id="modal-body"></div>
                </div>
            </div>
        `;
    }
    connectedCallback() {
        this.querySelector('#modal-close').onclick = () => this.close();
        this.querySelector('#modal-backdrop').onclick = (e) => {
            if (e.target.id === 'modal-backdrop') this.close();
        };
    }
    open(char) {
        const body = this.querySelector('#modal-body');
        body.innerHTML = `
            <div class="char-modal-layout">
                <div class="char-modal-image">
                    <img src="${char.image}" alt="${char.name}">
                </div>
                <div class="char-modal-info">
                    <h2 style="font-size: 2.5rem; margin-bottom: 0.5rem;">${char.name}</h2>
                    <p style="color: var(--primary-color); font-weight: 700; margin-bottom: 1.5rem;">${char.title}</p>
                    <div class="info-tabs">
                        <button class="tab-btn active">상세 설명</button>
                    </div>
                    <div class="tab-content">
                        <p style="font-size: 1.1rem; line-height: 1.8;">${char.desc}</p>
                        <div style="margin-top: 2rem; padding: 1.5rem; background: var(--accent-color); border-radius: 12px;">
                            <h4 style="margin-bottom: 0.5rem;">배경 스토리</h4>
                            <p style="opacity: 0.9;">${char.lore}</p>
                            <h4 style="margin-top: 1.5rem; margin-bottom: 0.5rem;">성격</h4>
                            <p style="opacity: 0.9;">${char.personality}</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        this.querySelector('#modal-backdrop').classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    close() {
        this.querySelector('#modal-backdrop').classList.remove('active');
        document.body.style.overflow = '';
        // Remove hash without trigger navigation if possible, or just go back to characters
        if (window.location.hash.startsWith('#char/')) {
            window.location.hash = '#characters';
        }
    }
}
customElements.define('character-modal', CharacterModal);

// Routing & View Logic
function navigate() {
    const hash = window.location.hash || '#home';
    const views = document.querySelectorAll('.view');
    const navLinks = document.querySelectorAll('.nav-link');
    const modal = document.querySelector('character-modal');

    // Handle Modal
    if (hash.startsWith('#char/')) {
        const charId = hash.split('/')[1];
        const char = CHARACTERS.find(c => c.id === charId);
        if (char && modal) {
            modal.open(char);
        }
        
        // Ensure character grid is visible in the background
        if (Array.from(views).every(v => v.style.display === 'none')) {
            document.getElementById('view-characters').style.display = 'block';
            renderCharGrid();
            document.querySelector('.nav-link[href="#characters"]')?.classList.add('active');
        }
        return;
    }

    // Close modal if open and we navigated away
    if (modal && !hash.startsWith('#char/')) {
        modal.querySelector('#modal-backdrop').classList.remove('active');
        document.body.style.overflow = '';
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
    
    // Auto-active characters link for detail views
    if (hash.startsWith('#char/')) {
        document.querySelector('.nav-link[href="#characters"]')?.classList.add('active');
    }

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
        cards.forEach(card => {
            const text = card.textContent.toLowerCase();
            card.style.display = text.includes(term) ? 'block' : 'none';
        });
    };
}

function renderCharGrid() {
    const grid = document.getElementById('char-grid');
    grid.innerHTML = CHARACTERS.map(char => `
        <div class="character-card" onclick="location.hash='#char/${char.id}'">
            <div class="card-img-wrap"><img src="${char.image}" alt="${char.name}"></div>
            <div class="card-info">
                <h3>${char.name}</h3>
                <p>${char.title}</p>
            </div>
        </div>
    `).join('');
}

// Initial Setup
window.addEventListener('hashchange', navigate);
window.addEventListener('load', () => {
    if (localStorage.getItem('theme') === 'dark') document.body.classList.add('dark-mode');
    navigate();

    // Playlist switching logic
    document.querySelectorAll('.playlist li').forEach(li => {
        li.onclick = function() {
            document.querySelector('.playlist li.active').classList.remove('active');
            this.classList.add('active');
            const videoId = this.dataset.video;
            document.getElementById('main-player').src = `https://www.youtube.com/embed/videoseries?list=${videoId}`;
        };
    });

    // Sidebar Toggle
    const sidebar = document.getElementById('main-sidebar');
    const toggle = document.getElementById('sidebar-toggle');
    if (toggle) toggle.onclick = () => sidebar.classList.toggle('active');
});
