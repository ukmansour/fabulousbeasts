import { CHARACTERS, DETAIL_SECTIONS } from './data.js';

function loadDetail() {
    const charId = window.location.hash.replace('#', '');
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

    // 기본 정보 테이블 생성
    const profileRows = [
        { label: '이름', value: char.name },
        { label: '별명', value: char.nickname },
        { label: '성별', value: char.gender },
        { label: '종', value: char.species },
        { label: '키', value: char.height },
        { label: '털색', value: char.furColor },
        { label: '눈색', value: char.eyeColor },
        { label: '국적', value: char.nationality },
        { label: '생일', value: char.birthday }
    ].map(row => `<tr><th>${row.label}</th><td>${row.value || '-'}</td></tr>`).join('');

    // 8대 섹션 HTML 생성
    const sectionsHtml = DETAIL_SECTIONS.map(section => `
        <div class="detail-section">
            <h2>${section.label}</h2>
            <div class="detail-content">
                <p>${char[section.id] || '-'}</p>
            </div>
        </div>
    `).join('');

    container.innerHTML = `
        <div class="detail-header">
            <div class="detail-image">
                <img src="${char.image}" alt="${char.name}">
            </div>
            <div class="detail-info">
                <h1 style="font-size: 3rem; margin-bottom: 0.5rem;">${char.name}</h1>
                <p style="color: var(--primary-color); font-weight: 700; font-size: 1.2rem; margin-bottom: 1rem;">${char.title}</p>
                
                <table class="profile-table">
                    ${profileRows}
                </table>
            </div>
        </div>

        <div class="detail-sections-wrapper">
            ${sectionsHtml}
        </div>
    `;
}

window.addEventListener('load', loadDetail);
window.addEventListener('hashchange', loadDetail);
