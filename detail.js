import { CHARACTERS } from './data.js';

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

    container.innerHTML = `
        <div class="detail-header">
            <div class="detail-image">
                <img src="${char.image}" alt="${char.name}">
            </div>
            <div class="detail-info">
                <h1 style="font-size: 3rem; margin-bottom: 0.5rem;">${char.name}</h1>
                <p style="color: var(--primary-color); font-weight: 700; font-size: 1.2rem; margin-bottom: 1rem;">${char.title}</p>
                
                <table class="profile-table">
                    <tr><th>이름</th><td>${char.name || '-'}</td></tr>
                    <tr><th>별명</th><td>${char.nickname || '-'}</td></tr>
                    <tr><th>성별</th><td>${char.gender || '-'}</td></tr>
                    <tr><th>종</th><td>${char.species || '-'}</td></tr>
                    <tr><th>키</th><td>${char.height || '-'}</td></tr>
                    <tr><th>털색</th><td>${char.furColor || '-'}</td></tr>
                    <tr><th>눈색</th><td>${char.eyeColor || '-'}</td></tr>
                    <tr><th>국적</th><td>${char.nationality || '-'}</td></tr>
                    <tr><th>생일</th><td>${char.birthday || '-'}</td></tr>
                </table>
            </div>
        </div>

        <div class="detail-section">
            <h2>상세 설명</h2>
            <div class="detail-content">
                <p>${char.desc}</p>
                <p>${char.personality ? '성격: ' + char.personality : ''}</p>
            </div>
        </div>

        <div class="detail-section">
            <h2>스토리</h2>
            <div class="detail-content">
                <p>${char.lore}</p>
            </div>
        </div>
    `;
}

window.addEventListener('load', loadDetail);
window.addEventListener('hashchange', loadDetail);
