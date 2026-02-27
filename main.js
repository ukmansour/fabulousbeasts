const CHARACTERS = [
    {
        id: 'tianlu',
        name: '천록 (天禄, 벽사 辟邪)',
        kName: '천록',
        title: '행운을 가져다주는 벽사',
        desc: '금품을 먹는 어린 벽사. 항상 배고파하며 행운을 가져다준다고 믿어집니다.',
        image: 'https://i.pinimg.com/564x/21/f0/2c/21f02c5e5a230f2dd31b8a6b10164c3c.jpg',
        lore: '고대 신화 속의 벽사(Pi Xiu)로, 현대 사회에서 닉(Nick)과 사불상과 함께 살고 있습니다. 먹을 것을 매우 좋아하며, 특히 금속이나 보석을 좋아합니다.',
        personality: '천진난만하고 낙천적입니다. 가끔 사고를 치기도 하지만 미워할 수 없는 매력을 가졌습니다.'
    },
    {
        id: 'sibuxiang',
        name: '사불상 (四不像)',
        kName: '사불상',
        title: '루렌디엔 유물 가게 주인',
        desc: '"루렌디엔" 유물 가게의 주인. 다른 이들을 돕기 위해 지상으로 내려온 상서로운 짐승입니다.',
        image: 'https://i.pinimg.com/564x/b8/22/3e/b8223e71020297509b5c3d4b6b886915.jpg',
        lore: '기린의 첫째 아들로, 매우 강력한 신통력을 가지고 있습니다. 하지만 지상에서는 평범한(?) 가게 주인으로 살아가고 있습니다.',
        personality: '침착하고 현명하며, 주변 사람들을 잘 챙깁니다. 하지만 가끔 엄격한 면도 보여줍니다.'
    },
    {
        id: 'tony',
        name: '투예 (兔爷)',
        kName: '투예',
        title: '부유한 기업가 달토끼',
        desc: '달토끼이자 부유한 기업가. 사불상의 마음을 얻기 위해 노력합니다.',
        image: 'https://i.pinimg.com/564x/a3/1b/30/a31b302781b3b2c6d482283a316a3a41.jpg',
        lore: '달에서 온 토끼로, 지상에서 큰 성공을 거둔 사업가입니다. 사불상을 짝사랑하며 항상 그에게 구애를 합니다.',
        personality: '자신감이 넘치고 화려한 것을 좋아합니다. 목표를 위해 아낌없이 투자하는 성격입니다.'
    },
    {
        id: 'pixiu',
        name: '피쇼 (Pixiu)',
        kName: '피쇼',
        title: '신비로운 행운의 상징',
        desc: '천록의 형. 동생과 달리 차분하고 어른스럽지만, 사실은 동생을 매우 아낍니다.',
        image: 'https://i.pinimg.com/564x/4e/7d/de/4e7dde8a7c6f043c92a0a256a52a51a3.jpg',
        lore: '천록과 함께 사는 또 다른 벽사. 더 성숙하고 강력한 힘을 지니고 있습니다. 가끔은 천록의 보호자 역할을 합니다.',
        personality: '조용하고 신중하지만, 가족에게는 따뜻한 마음을 가지고 있습니다. 강력한 힘을 숨기고 있습니다.'
    },
    {
        id: 'pandada',
        name: '판다다 (Pandada)',
        kName: '판다다',
        title: '대나무숲의 아이돌',
        desc: '인터넷 방송을 하는 인기 많은 판다. 귀여운 외모와 달리 까칠한 성격입니다.',
        image: 'https://i.pinimg.com/564x/e7/73/77/e77377d61083e956b68514106b12ba94.jpg',
        lore: '유명한 인플루언서로, 자신의 채널을 통해 팬들과 소통합니다. 사실은 평범한 삶을 동경하고 있습니다.',
        personality: '겉으로는 까칠하고 도도해 보이지만, 속은 여리고 정이 많습니다. 자신의 인기에 대한 부담감을 느끼고 있습니다.'
    },
    {
        id: 'li',
        name: '리 (Li)',
        kName: '리',
        title: '매혹적인 구미호',
        desc: '아름다운 외모를 가진 구미호. 사람의 마음을 홀리는 능력을 가지고 있습니다.',
        image: 'https://i.pinimg.com/564x/9a/59/11/9a5911d33b86503c530e6cb4b5b5a265.jpg',
        lore: '수천 년을 살아온 구미호로, 다양한 모습으로 변신할 수 있습니다. 사불상과는 오랜 인연을 가지고 있습니다.',
        personality: '우아하고 신비로운 분위기를 풍깁니다. 자신의 감정을 잘 드러내지 않지만, 사실은 외로움을 많이 느깁니다.'
    },
    {
        id: 'fenrir',
        name: '펜리르 (Fenrir)',
        kName: '펜리르',
        title: '북유럽 신화의 늑대',
        desc: '북유럽 신화에서 온 강력한 늑대. 힘을 제어하지 못해 문제를 일으키기도 합니다.',
        image: 'https://i.pinimg.com/564x/27/55/e5/2755e5c544e33989c47c505b22b64d30.jpg',
        lore: '오딘에 의해 봉인되었다가 풀려난 신화 속의 늑대. 현대 사회에 적응하기 위해 노력하고 있습니다.',
        personality: '거칠고 반항적으로 보이지만, 인정받고 싶어 하는 욕구가 강합니다. 의외로 순수한 면이 있습니다.'
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

    if (hash.startsWith('#char/')) {
        const charId = hash.split('/')[1];
        const char = CHARACTERS.find(c => c.id === charId);
        if (char && modal) {
            modal.open(char);
        }
        
        if (Array.from(views).every(v => v.style.display === 'none')) {
            document.getElementById('view-characters').style.display = 'block';
            renderCharGrid();
            document.querySelector('.nav-link[href="#characters"]')?.classList.add('active');
        }
        return;
    }

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

    document.querySelectorAll('.playlist li').forEach(li => {
        li.onclick = function() {
            document.querySelector('.playlist li.active').classList.remove('active');
            this.classList.add('active');
            const videoId = this.dataset.video;
            document.getElementById('main-player').src = `https://www.youtube.com/embed/videoseries?list=${videoId}`;
        };
    });

    const sidebar = document.getElementById('main-sidebar');
    const toggle = document.getElementById('sidebar-toggle');
    if (toggle) toggle.onclick = () => sidebar.classList.toggle('active');
});
