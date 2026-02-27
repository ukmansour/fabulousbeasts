const CATEGORIES = [
    "메인 캐릭터", "녹인점", "고대", "지옥", "토보서", "채운산", "비휴", 
    "기린", "맹극", "와묘", "신조", "천상", "타장르", "기타"
];

const CHARACTERS = [
    // 메인 캐릭터
    { 
        id: 'tianlu', 
        category: '메인 캐릭터', 
        name: '천록 (天禄)', 
        title: '부를 불러와주는 비휴', 
        image: 'https://img1.daumcdn.net/thumb/R1280x0/?scode=mtistory2&fname=https%3A%2F%2Fblog.kakaocdn.net%2Fdna%2FbcXQoT%2FdJMcadA2rAc%2FAAAAAAAAAAAAAAAAAAAAAIL2JD45iIL4id-sqMYSQvlK0xdRWR-RaQhfhIvNqqnY%2Fimg.jpg%3Fcredential%3DyqXZFxpELC7KVnFOS48ylbz2pIh7yKj8%26expires%3D1772290799%26allow_ip%3D%26allow_referer%3D%26signature%3DuIV48xImOA7ML2o92NQPjf764VI%253D', 
        desc: '금품을 먹는 어린 벽사. 부와 행운을 불러옵니다.', 
        lore: '고대 신화 속의 벽사(Pi Xiu)입니다.', 
        personality: '천진난만하고 낙천적입니다.',
        nickname: '천록이',
        gender: '남성',
        species: '비휴 (벽사)',
        height: '약 40cm (변신 전)',
        furColor: '하얀색/옥색',
        eyeColor: '노란색',
        nationality: '중국 (신화계)',
        birthday: '알 수 없음'
    },
    { id: 'pixiu', category: '메인 캐릭터', name: '벽사 (辟邪)', title: '수호의 신수', image: 'https://postfiles.pstatic.net/MjAyNjAyMjdfMjE5/MDAxNzcyMTc1OTg0OTU3.OyQB3R7OC-15vRNB79JX8r6Wd5JxTUiHvsZxAqq5nLMg.YuP3_LtcBn5f7tcsxYnFY1UDKFE-haIuNSxbbhihH3gg.JPEG/%EB%B2%BD%EC%82%AC.jpg?type=w966', desc: '천록의 형. 더 성숙하고 강력한 힘을 지니고 있습니다.', lore: '동생을 끔찍이 아끼는 보호자입니다.', personality: '조용하고 신중합니다.' },
    { id: 'sibuxiang', category: '메인 캐릭터', name: '사불상 (四不像)', title: '유물 가게 주인', image: 'https://img1.daumcdn.net/thumb/R1280x0/?scode=mtistory2&fname=https%3A%2F%2Fblog.kakaocdn.net%2Fdna%2FbD0eLx%2FdJMcafr9eyx%2FAAAAAAAAAAAAAAAAAAAAAAjZQRaTjqxLHFq1C_vz2DjDAmpHr_i6HehWlH-4obHD%2Fimg.jpg%3Fcredential%3DyqXZFxpELC7KVnFOS48ylbz2pIh7yKj8%26expires%3D1772290799%26allow_ip%3D%26allow_referer%3D%26signature%3D9D2sgrhZJBp%252BVyeDIj5nf1TMJN8%253D', desc: '루렌디엔 유물 가게의 주인입니다.', lore: '기린의 첫째 아들로 강력한 신통력을 가졌습니다.', personality: '침착하고 현명합니다.' },
    { id: 'tony', category: '메인 캐릭터', name: '투예 (兔爷)', title: '달토끼 기업가', image: 'https://img1.daumcdn.net/thumb/R1280x0/?scode=mtistory2&fname=https%3A%2F%2Fblog.kakaocdn.net%2Fdna%2FKcUIj%2FdJMcaflokNh%2FAAAAAAAAAAAAAAAAAAAAAGSQRnO0c8CI22cpfXLpydcTTRVnKqg4FgAas4yhvs0Y%2Fimg.jpg%3Fcredential%3DyqXZFxpELC7KVnFOS48ylbz2pIh7yKj8%26expires%3D1772290799%26allow_ip%3D%26allow_referer%3D%26signature%3DNaFtgpU5vmas1VzvSRfUJ%252Fvn7zw%253D', desc: '달에서 온 부유한 사업가입니다.', lore: '사불상을 짝사랑하여 항상 구애합니다.', personality: '자신감 넘치고 화려합니다.' },

    // 녹인점
    ...["금각", "은각", "호두", "후쿠", "쇼타", "마키", "전호", "메이메이", "파릉군", "파혁", "영야"].map(name => ({
        id: `nok-${name}`, category: '녹인점', name, title: '녹인점 소속', image: 'https://via.placeholder.com/300?text=' + encodeURIComponent(name), desc: `${name} 캐릭터입니다.`, lore: '녹인점의 일원입니다.', personality: '다양한 매력을 가졌습니다.'
    })),

    // 고대
    ...["사불상", "제강", "혼돈", "도철", "궁기", "도올", "경천수", "금오"].map(name => ({
        id: `anc-${name}`, category: '고대', name, title: '고대 신수', image: 'https://via.placeholder.com/300?text=' + encodeURIComponent(name), desc: `고대로부터 전해지는 신수 ${name}입니다.`, lore: '전설적인 배경을 가지고 있습니다.', personality: '강력하고 신비롭습니다.'
    })),

    // 지옥
    ...["체청", "소루", "칭훠", "지마"].map(name => ({
        id: `hell-${name}`, category: '지옥', name, title: '지옥 거주자', image: 'https://via.placeholder.com/300?text=' + encodeURIComponent(name), desc: `지옥에서 온 ${name}입니다.`, lore: '지옥의 질서를 유지합니다.', personality: '냉철하거나 독특합니다.' },
    })),

    // 토보서
    ...["토보서", "다람쥐형", "황사아", "황오"].map(name => ({
        id: `tob-${name}`, category: '토보서', name, title: '토보서 소속', image: 'https://via.placeholder.com/300?text=' + encodeURIComponent(name), desc: `토보서의 ${name}입니다.`, lore: '작고 귀여운 존재들입니다.', personality: '활발하고 호기심이 많습니다.'
    })),

    // 채운산
    ...["리치", "장장", "추구", "소산작", "마오마오레이", "반호", "해치", "화초", "샤오빙", "유성"].map(name => ({
        id: `chaeun-${name}`, category: '채운산', name, title: '채운산 소속', image: 'https://via.placeholder.com/300?text=' + encodeURIComponent(name), desc: `채운산에 거주하는 ${name}입니다.`, lore: '산의 정기를 받고 자랐습니다.', personality: '평화롭고 조화롭습니다.'
    })),

    // 비휴
    { id: 'pixiu-77', category: '비휴', name: '칠십칠', title: '비휴 77', image: 'https://via.placeholder.com/300?text=77', desc: '비휴 종족의 칠십칠입니다.', lore: '천록과 같은 종족입니다.', personality: '성격이 독특합니다.' },

    // 기린
    ...["시기린", "옥기린"].map(name => ({
        id: `qilin-${name}`, category: '기린', name, title: '기린 일족', image: 'https://via.placeholder.com/300?text=' + encodeURIComponent(name), desc: `고귀한 기린 일족의 ${name}입니다.`, lore: '상서로움의 상징입니다.', personality: '고결하고 우아합니다.'
    })),

    // 맹극
    ...["협죽도", "목화", "운두"].map(name => ({
        id: `maeng-${name}`, category: '맹극', name, title: '맹극 소속', image: 'https://via.placeholder.com/300?text=' + encodeURIComponent(name), desc: `맹극의 ${name}입니다.`, lore: '빠른 속도를 자랑합니다.', personality: '민첩하고 용감합니다.'
    })),

    // 와묘
    ...["용묘", "묘룡"].map(name => ({
        id: `wamyo-${name}`, category: '와묘', name, title: '와묘 종족', image: 'https://via.placeholder.com/300?text=' + encodeURIComponent(name), desc: `고양이와 용의 특징을 가진 ${name}입니다.`, lore: '희귀한 종족입니다.', personality: '변덕스럽지만 귀엽습니다.'
    })),

    // 신조
    ...["봉황", "금시대붕", "크리스티나", "비비"].map(name => ({
        id: `shinjo-${name}`, category: '신조', name, title: '신성한 새', image: 'https://via.placeholder.com/300?text=' + encodeURIComponent(name), desc: `하늘을 나는 신성한 새 ${name}입니다.`, lore: '하늘의 지배자들입니다.', personality: '자유롭고 도도합니다.'
    })),

    // 천상
    ...["잉쟈오", "정향"].map(name => ({
        id: `heaven-${name}`, category: '천상', name, title: '천계 거주자', image: 'https://via.placeholder.com/300?text=' + encodeURIComponent(name), desc: `천상계의 ${name}입니다.`, lore: '신성한 임무를 수행합니다.', personality: '엄격하고 경건합니다.'
    })),

    // 타장르
    { id: 'other-baektaek', category: '타장르', name: '백택', title: '만물의 지식인', image: 'https://via.placeholder.com/300?text=Baektaek', desc: '모든 것을 알고 있는 백택입니다.', lore: '다른 세계관에서 온 손님입니다.', personality: '박학다식합니다.' },

    // 기타
    { id: 'etc-daesan', category: '기타', name: '대산', title: '기타 캐릭터', image: 'https://via.placeholder.com/300?text=Daesan', desc: '대산입니다.', lore: '알려지지 않은 배경을 가졌습니다.', personality: '미스터리합니다.' },
    { id: 'pandada', category: '기타', name: '판다다 (Pandada)', title: '아이돌 판다', image: 'https://i.pinimg.com/564x/e7/73/77/e77377d61083e956b68514106b12ba94.jpg', desc: '인기 많은 방송인 판다입니다.', lore: '지상의 아이돌입니다.', personality: '까칠하지만 속은 따뜻합니다.' }
];

export { CHARACTERS, CATEGORIES };

// Global function for character detail window
window.openCharacter = (charId) => {
    window.open(`detail.html?id=${charId}`, '_blank');
};

// Routing & View Logic
function navigate() {
    const hash = window.location.hash || '#home';
    const views = document.querySelectorAll('.view');
    const navLinks = document.querySelectorAll('.nav-link');

    // Remove hash-based character navigation since we use direct onclick now
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
            card.style.display = text.includes(term) ? 'block' : 'none';
        });

        sections.forEach(section => {
            const visibleCards = section.querySelectorAll('.character-card[style="display: block;"]');
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
                        <div class="character-card" onclick="openCharacter('${char.id}')">
                            <div class="card-img-wrap"><img src="${char.image}" alt="${char.name}"></div>
                            <div class="card-info">
                                <h3>${char.name}</h3>
                                <p>${char.title}</p>
                            </div>
                        </div>
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
