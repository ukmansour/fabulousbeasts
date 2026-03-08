import { CHARACTERS, DETAIL_SECTIONS } from './data.js';

function loadDetail() {
    const charId = window.location.hash.split('-')[0].replace('#', '');
    const char = CHARACTERS.find(c => c.id === charId);
    const container = document.getElementById('detail-container');

    if (!container) return;

    if (!char) {
        container.innerHTML = `
            <div style="text-align: center; padding: 3rem;">
                <h2>캐릭터를 찾을 수 없습니다.</h2>
                <p>ID: ${charId}</p>
                <a href="index.html" class="btn-primary" style="display: inline-block; margin-top: 1rem; text-decoration: none;">홈으로 돌아가기</a>
            </div>
        `;
        return;
    }

    document.title = `${char.name} - 유수언 위키`;

    // 유효한 섹션 필터링
    const activeSections = DETAIL_SECTIONS.filter(s => {
        const content = char[s.id];
        return content && content.trim() !== '' && content !== '-';
    });

    // 퀵 네비게이션 (네모 상자 제거 버전)
    const quickNavHtml = activeSections.length > 0 ? `
        <nav class="detail-quick-nav">
            <ul style="list-style: none; padding: 0; display: flex; flex-wrap: wrap; gap: 1.2rem; margin: 0;">
                ${activeSections.map((s, index) => `<li><a href="#${charId}-${s.id}" style="text-decoration: none; color: var(--primary-color); font-weight: 600; font-size: 1.05rem;">${index + 1}. ${s.label}</a></li>`).join('')}
            </ul>
        </nav>
    ` : '';

    // 활성 섹션 HTML
    const sectionsHtml = activeSections.map((section, index) => `
        <div class="detail-section" id="${charId}-${section.id}">
            <h2>${index + 1}. ${section.label}</h2>
            <div class="detail-content">
                <p>${char[section.id]}</p>
            </div>
        </div>
    `).join('');

    // 인포박스 생성
    let infoboxHtml = char.infobox;
    if (!infoboxHtml) {
        infoboxHtml = `
            <div class="infobox">
                <div class="infobox-row"><strong>이름:</strong> ${char.name}</div>
                <div class="infobox-row"><strong>별명:</strong> ${char.nickname || '-'}</div>
                <div class="infobox-row"><strong>성별:</strong> ${char.gender || '-'}</div>
                <div class="infobox-row"><strong>종:</strong> ${char.species || '-'}</div>
                <div class="infobox-row"><strong>키:</strong> ${char.height || '-'}</div>
                <div class="infobox-row"><strong>털색:</strong> ${char.furColor || '-'}</div>
                <div class="infobox-row"><strong>눈색:</strong> ${char.eyeColor || '-'}</div>
                <div class="infobox-row"><strong>국적:</strong> ${char.nationality || '-'}</div>
                <div class="infobox-row"><strong>생일:</strong> ${char.birthday || '-'}</div>
            </div>
        `;
    }

    container.innerHTML = `
        <div class="detail-main-layout">
            <div class="detail-left-col">
                <div class="detail-header-group">
                    <h1 style="font-size: 3.5rem; margin-bottom: 0.5rem; color: var(--secondary-color);">${char.name}</h1>
                    <p style="color: var(--primary-color); font-weight: 700; font-size: 1.4rem; margin-bottom: 2rem; opacity: 0.8;">${char.title}</p>
                </div>
                
                <div class="sticky-nav-wrapper">
                    ${quickNavHtml}
                </div>

                <div class="detail-sections-wrapper" style="margin-top: 3rem;">
                    ${sectionsHtml}
                </div>
            </div>

            <div class="detail-right-col">
                <div class="detail-image-container">
                    <img src="${char.image}" alt="${char.name}">
                </div>
                ${infoboxHtml}
            </div>
        </div>
    `;
}

window.addEventListener('load', loadDetail);
window.addEventListener('hashchange', () => {
    const hash = window.location.hash;
    if (hash.includes('-')) {
        const element = document.getElementById(hash.replace('#', ''));
        if (element) {
            // 헤더 높이만큼 여유를 두고 스크롤
            const headerOffset = 150;
            const elementPosition = element.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

            window.scrollTo({
                top: offsetPosition,
                behavior: "smooth"
            });
        }
    } else {
        loadDetail();
        window.scrollTo(0, 0);
    }
});
