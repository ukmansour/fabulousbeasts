import { CHARACTERS, DETAIL_SECTIONS } from './data.js';
import { db, auth } from './firebase-config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// 마크다운 파서 라이브러리 로드 (CDN)
const script = document.createElement('script');
script.src = "https://cdn.jsdelivr.net/npm/marked/marked.min.js";
document.head.appendChild(script);

// 유저 상태 관리
onAuthStateChanged(auth, (user) => {
    const userInfo = document.getElementById('user-info');
    if (!userInfo) return;
    if (user) {
        const displayName = user.displayName || user.email.split('@')[0];
        userInfo.innerHTML = `
            <span class="nav-link" style="color: var(--secondary-color); font-weight: 700;">${displayName}님</span>
            <a href="#" class="nav-link" id="logout-btn">로그아웃</a>
        `;
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.onclick = (e) => {
                e.preventDefault();
                if (confirm("로그아웃하시겠습니까?")) {
                    signOut(auth).then(() => {
                        window.location.href = 'index.html';
                    });
                }
            };
        }
    } else {
        userInfo.innerHTML = `<a href="auth.html" class="nav-link" id="login-link">로그인</a>`;
    }
});

async function loadDetail() {
    const charId = window.location.hash.split('-')[0].replace('#', '');
    const container = document.getElementById('detail-container');
    if (!container) return;

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

    // 캐릭터 데이터가 아예 없는 경우 처리
    if (!char) {
        container.innerHTML = `
            <div style="padding: 8rem 2rem; text-align: center; background: #fff; border-radius: 24px;">
                <h1 style="font-size: 2.5rem; color: var(--primary-color); margin-bottom: 1.5rem;">새로운 발견!</h1>
                <p style="font-size: 1.2rem; color: #666; margin-bottom: 3rem;">아직 이 캐릭터에 대한 정보가 위키에 등록되지 않았습니다.<br>직접 첫 번째 기록을 남겨보시겠어요?</p>
                <button id="create-btn" class="btn-primary" style="padding: 1.2rem 3rem; font-size: 1.3rem;">정보 등록하기</button>
            </div>
        `;
        document.getElementById('create-btn').addEventListener('click', () => {
            if (auth.currentUser) window.location.href = `edit.html#${charId}`;
            else { alert("정보를 등록하려면 로그인이 필요합니다."); window.location.href = 'auth.html'; }
        });
        return;
    }

    document.title = `${char.name} - 유수언 위키`;

    const renderMarkdown = (text) => {
        if (typeof marked !== 'undefined' && text) {
            return marked.parse(text);
        }
        return text || '';
    };

    const activeSections = DETAIL_SECTIONS.filter(s => {
        const content = char[s.id];
        return content && content.trim() !== '' && content !== '-';
    });

    // 상세 내용이 하나도 없는 경우 처리
    const hasContent = activeSections.length > 0;

    const quickNavHtml = hasContent ? `
        <nav class="detail-quick-nav">
            <ul style="list-style: none; padding: 0; display: flex; flex-wrap: wrap; gap: 1rem; margin: 0;">
                ${activeSections.map((s, index) => `<li><a href="#${charId}-${s.id}">${index + 1}. ${s.label}</a></li>`).join('')}
            </ul>
        </nav>
    ` : '';

    const sectionsHtml = hasContent ? activeSections.map((section, index) => {
        let contentHtml = '';
        if (section.id === 'gallery') {
            const images = char[section.id].split('\n').filter(url => url.trim().startsWith('http'));
            if (images.length > 0) {
                contentHtml = `<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; margin-top: 1rem;">
                    ${images.map(img => `<img src="${img.trim()}" style="width:100%; border-radius:8px; cursor:pointer;" onclick="window.open(this.src)">`).join('')}
                </div>`;
            } else { contentHtml = renderMarkdown(char[section.id]); }
        } else { contentHtml = renderMarkdown(char[section.id]); }

        return `
            <div class="detail-section" id="${charId}-${section.id}">
                <h2>${index + 1}. ${section.label}</h2>
                <div class="detail-content wiki-content">${contentHtml}</div>
            </div>
        `;
    }).join('') : `
        <div style="padding: 3rem; background: #f9f9f9; border-radius: 12px; border: 2px dashed #ddd; text-align: center; margin-top: 2rem;">
            <p style="color: #888;">상세 정보가 아직 작성되지 않았습니다.<br>오른쪽 상단의 [편집] 버튼을 눌러 내용을 채워주세요!</p>
        </div>
    `;

    const infoboxHtml = `
        <div class="infobox">
            <div class="infobox-row"><strong>이름:</strong> ${char.name}</div>
            <div class="infobox-row"><strong>별명:</strong> ${char.nickname || '-'}</div>
            <div class="infobox-row"><strong>성별:</strong> ${char.gender || '-'}</div>
            <div class="infobox-row"><strong>종족:</strong> ${char.species || '-'}</div>
            <div class="infobox-row"><strong>국적:</strong> ${char.nationality || '-'}</div>
            <div class="infobox-row"><strong>생일:</strong> ${char.birthday || '-'}</div>
            <div class="infobox-row"><strong>키:</strong> ${char.height || '-'}</div>
        </div>
    `;

    let historyHtml = '';
    if (char.history && char.history.length > 0) {
        historyHtml = `
            <div class="detail-section" style="margin-top: 5rem; border-top: 1px solid #ddd; padding-top: 2rem;">
                <h2 style="font-size: 1.2rem; color: #555;">최근 편집 기록</h2>
                <div class="wiki-history">
                    ${char.history.slice(0, 5).map(entry => `
                        <div style="display: flex; gap: 1rem; font-size: 0.9rem; margin-bottom: 0.5rem; border-bottom: 1px dashed #eee; padding-bottom: 0.5rem;">
                            <span style="color: #888;">${new Date(entry.timestamp?.seconds * 1000 || entry.timestamp).toLocaleString()}</span>
                            <span style="font-weight: 700; color: var(--primary-color);">${entry.user}</span>
                            <span style="color: #444;">(${entry.note || '내용 수정'})</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    container.innerHTML = `
        <div class="detail-main-layout">
            <div class="detail-left-col">
                <div class="detail-header-group">
                    <div style="display: flex; justify-content: space-between; align-items: flex-end;">
                        <div>
                            <h1 style="font-size: 3rem; margin-bottom: 0.5rem;">${char.name}</h1>
                            <p style="color: #888; font-size: 1.2rem;">${char.title || ''}</p>
                        </div>
                        <div id="edit-action-container"></div>
                    </div>
                </div>
                
                <div class="sticky-nav-wrapper">${quickNavHtml}</div>

                <div class="detail-sections-wrapper" style="margin-top: 2rem;">
                    ${sectionsHtml}
                </div>
                ${historyHtml}
            </div>

            <div class="detail-right-col">
                <div class="detail-image-container">
                    <img src="${char.image}" alt="${char.name}">
                </div>
                ${infoboxHtml}
            </div>
        </div>
    `;

    const editContainer = document.getElementById('edit-action-container');
    if (editContainer) {
        editContainer.innerHTML = `<button id="edit-btn" class="btn-primary" style="padding: 0.6rem 1.2rem;">편집</button>`;
        document.getElementById('edit-btn').addEventListener('click', () => {
            if (auth.currentUser) window.location.href = `edit.html#${charId}`;
            else { alert("로그인이 필요합니다."); window.location.href = 'auth.html'; }
        });
    }
}

window.addEventListener('load', () => {
    setTimeout(loadDetail, 100);
});
window.addEventListener('hashchange', loadDetail);
