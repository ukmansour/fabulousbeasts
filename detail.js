import { CHARACTERS, DETAIL_SECTIONS } from './data.js';
import { db, auth } from './firebase-config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

async function loadDetail() {
    const charId = window.location.hash.split('-')[0].replace('#', '');
    const container = document.getElementById('detail-container');
    if (!container) return;

    // Firestore에서 데이터 가져오기 시도
    let char = CHARACTERS.find(c => c.id === charId);
    try {
        const docRef = doc(db, "characters", charId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            char = { ...char, ...docSnap.data() };
        }
    } catch (e) {
        console.warn("Firestore fetch error:", e);
    }

    if (!char) {
        container.innerHTML = `<h2>캐릭터를 찾을 수 없습니다.</h2>`;
        return;
    }

    document.title = `${char.name} - 유수언 위키`;

    // 유효한 섹션 필터링
    const activeSections = DETAIL_SECTIONS.filter(s => {
        const content = char[s.id];
        return content && content.trim() !== '' && content !== '-';
    });

    const quickNavHtml = activeSections.length > 0 ? `
        <nav class="detail-quick-nav">
            <ul style="list-style: none; padding: 0; display: flex; flex-wrap: wrap; gap: 1.2rem; margin: 0;">
                ${activeSections.map((s, index) => `<li><a href="#${charId}-${s.id}">${index + 1}. ${s.label}</a></li>`).join('')}
            </ul>
        </nav>
    ` : '';

    const sectionsHtml = activeSections.map((section, index) => `
        <div class="detail-section" id="${charId}-${section.id}">
            <h2>${index + 1}. ${section.label}</h2>
            <div class="detail-content">
                <p>${char[section.id]}</p>
            </div>
        </div>
    `).join('');

    let infoboxHtml = char.infobox || `
        <div class="infobox">
            <div class="infobox-row"><strong>이름:</strong> ${char.name}</div>
            <div class="infobox-row"><strong>별명:</strong> ${char.nickname || '-'}</div>
            <div class="infobox-row"><strong>성별:</strong> ${char.gender || '-'}</div>
            <div class="infobox-row"><strong>종:</strong> ${char.species || '-'}</div>
        </div>
    `;

    container.innerHTML = `
        <div class="detail-main-layout">
            <div class="detail-left-col">
                <div class="detail-header-group">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div>
                            <h1 style="font-size: 3.5rem; margin-bottom: 0.5rem; color: var(--secondary-color);">${char.name}</h1>
                            <p style="color: var(--primary-color); font-weight: 700; font-size: 1.4rem; margin-bottom: 2rem; opacity: 0.8;">${char.title}</p>
                        </div>
                        <div id="edit-action-container"></div>
                    </div>
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

    // 유저 상태에 따른 편집 버튼 노출
    onAuthStateChanged(auth, (user) => {
        const userInfo = document.getElementById('user-info');
        const editContainer = document.getElementById('edit-action-container');
        
        if (user) {
            if (userInfo) {
                userInfo.innerHTML = `
                    <span class="nav-link" style="color: var(--secondary-color); font-weight: 700;">${user.email.split('@')[0]}님</span>
                    <a href="#" class="nav-link" id="logout-btn">로그아웃</a>
                `;
                document.getElementById('logout-btn').addEventListener('click', () => signOut(auth));
            }
            if (editContainer) {
                editContainer.innerHTML = `<a href="edit.html#${charId}" class="btn-primary" style="text-decoration: none;">편집하기</a>`;
            }
        } else {
            if (userInfo) userInfo.innerHTML = `<a href="auth.html" class="nav-link">로그인</a>`;
            if (editContainer) editContainer.innerHTML = '';
        }
    });
}

window.addEventListener('load', loadDetail);
window.addEventListener('hashchange', () => {
    const hash = window.location.hash;
    if (hash.includes('-')) {
        const element = document.getElementById(hash.replace('#', ''));
        if (element) {
            window.scrollTo({ top: element.getBoundingClientRect().top + window.pageYOffset - 150, behavior: "smooth" });
        }
    } else {
        loadDetail();
    }
});
