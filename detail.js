import { CHARACTERS, DETAIL_SECTIONS } from './data.js';
import { db, auth } from './firebase-config.js';
import { doc, getDoc, collection, query, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const script = document.createElement('script');
script.src = "https://cdn.jsdelivr.net/npm/marked/marked.min.js";
document.head.appendChild(script);

onAuthStateChanged(auth, (user) => {
    const userInfo = document.getElementById('user-info');
    if (!userInfo) return;
    if (user) {
        userInfo.innerHTML = `<span style="color:white; font-size:0.75rem; margin-right:0.4rem; font-weight:400;">${user.displayName || '유저'}님</span>
                              <a href="#" class="nav-link" id="logout-btn">로그아웃</a>`;
        document.getElementById('logout-btn').onclick = (e) => {
            e.preventDefault();
            if (confirm("로그아웃하시겠습니까?")) signOut(auth).then(() => location.reload());
        };
    } else {
        userInfo.innerHTML = `<a href="auth.html" class="nav-link">로그인</a>`;
    }
});

async function loadDetail() {
    const charId = window.location.hash.split('-')[0].replace('#', '');
    const container = document.getElementById('detail-container');
    if (!container) return;

    let char = null;
    try {
        const docRef = doc(db, "characters", charId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            char = { id: charId, ...docSnap.data() };
        } else {
            const localChar = CHARACTERS.find(c => c.id === charId);
            if (localChar) char = { ...localChar };
        }
    } catch (e) { console.error(e); }

    if (!char) {
        renderNotFound(container, charId);
    } else {
        renderWikiArticle(char);
    }
    
    renderRecentChanges();
    initSearch();
}

function renderWikiArticle(char) {
    const container = document.getElementById('detail-container');
    const actionTabs = document.getElementById('action-tabs');
    actionTabs.innerHTML = `<a href="edit.html#${char.id}" class="wiki-tab">편집</a><div class="wiki-tab">역사</div>`;

    const parseWikiText = (text) => {
        if (!text) return '';
        let parsed = text.replace(/\[\[([^|\]]+)(?:\|([^\]]+))?\]\]/g, (match, id, label) => {
            return `<a href="detail.html#${id.trim()}">${(label || id).trim()}</a>`;
        });
        return typeof marked !== 'undefined' ? marked.parse(parsed) : parsed;
    };

    const activeSections = DETAIL_SECTIONS.filter(s => char[s.id] && char[s.id].trim() !== '');
    const tocHtml = activeSections.length > 1 ? `
        <div class="wiki-toc">
            <div class="wiki-toc-title">목차</div>
            <ul>${activeSections.map((s, i) => `<li><a href="#s-${s.id}">${s.label}</a></li>`).join('')}</ul>
        </div>` : '';

    const sectionsHtml = activeSections.map(s => {
        let content = (s.id === 'gallery') 
            ? `<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(180px,1fr)); gap:0.8rem; margin-top:1rem;">
                ${char[s.id].split('\n').filter(u => u.trim().startsWith('http')).map(img => `<img src="${img.trim()}" style="width:100%; height:180px; object-fit:cover; border-radius:4px; border:1px solid #eee; cursor:pointer;" onclick="window.open(this.src)">`).join('')}
               </div>`
            : parseWikiText(char[s.id]);
        return `<div class="detail-section" id="s-${s.id}"><h2>${s.label}</h2><div class="wiki-content">${content}</div></div>`;
    }).join('');

    container.innerHTML = `
        <h1 class="wiki-title">${char.name}</h1>
        <div class="wiki-subtitle">
            <span>최근 수정: ${char.updatedAt ? new Date(char.updatedAt.seconds * 1000 || char.updatedAt).toLocaleString() : '기록 없음'}</span>
            <span>작성자: ${char.updatedBy || '익명'}</span>
        </div>
        
        <div class="infobox">
            <div class="infobox-title">${char.name}</div>
            <div class="infobox-image"><img src="${char.image || 'https://via.placeholder.com/400?text=No+Image'}" alt="${char.name}"></div>
            <table class="infobox-table">
                <tr><th>별명</th><td>${char.nickname || '-'}</td></tr>
                <tr><th>종족</th><td>${char.species || '-'}</td></tr>
                <tr><th>성별</th><td>${char.gender || '-'}</td></tr>
                <tr><th>국적</th><td>${char.nationality || '-'}</td></tr>
                <tr><th>생일</th><td>${char.birthday || '-'}</td></tr>
                <tr><th>키</th><td>${char.height || '-'}</td></tr>
            </table>
        </div>

        <p style="font-size:1.1rem; color:#444;">${char.title || ''}</p>
        ${tocHtml}
        <div style="clear: both;"></div>
        ${sectionsHtml || '<p style="color:#999; padding:3rem; text-align:center; border:1px dashed #ddd; margin-top:2rem;">상세 내용이 없습니다. 문서를 보강해 주세요!</p>'}
    `;
}

function renderNotFound(container, id) {
    container.innerHTML = `
        <h1 class="wiki-title">${id}</h1>
        <div style="padding: 6rem 2rem; text-align: center; background: #fff; border: 2px dashed #eee; margin-top: 2rem;">
            <p style="font-size: 1.3rem; color: #555; margin-bottom: 2rem;">"<strong>${id}</strong>" 문서가 존재하지 않습니다.<br>직접 새로운 문서를 만드시겠습니까?</p>
            <button class="btn-primary" style="padding: 1rem 4rem; font-size:1.1rem;" onclick="location.href='edit.html#${id}'">문서 만들기</button>
        </div>`;
}

async function initSearch() {
    const input = document.getElementById('global-search');
    const results = document.getElementById('search-results');
    if (!input) return;

    input.oninput = async () => {
        const val = input.value.trim().toLowerCase();
        if (val.length < 1) { results.classList.remove('active'); return; }
        
        // 검색 풀 구성 (로컬 + 파이어스토어 일부)
        const matches = CHARACTERS.filter(c => c.name.toLowerCase().includes(val) || c.id.toLowerCase().includes(val)).slice(0, 10);
        results.innerHTML = matches.length > 0 
            ? matches.map(m => `<div class="search-item" onclick="location.href='detail.html#${m.id}'"><strong>${m.name}</strong> <span style="font-size:0.7rem; color:#999;">(${m.id})</span></div>`).join('')
            : `<div class="search-item" onclick="location.href='edit.html#${val}'">"${val}" 신규 문서 만들기</div>`;
        results.classList.add('active');
    };
    document.addEventListener('click', (e) => { if(!input.contains(e.target)) results.classList.remove('active'); });
}

async function renderRecentChanges() {
    const list = document.getElementById('recent-changes-list');
    if (!list) return;
    try {
        const q = query(collection(db, "characters"), orderBy("updatedAt", "desc"), limit(10));
        const snap = await getDocs(q);
        list.innerHTML = snap.docs.map(doc => {
            const data = doc.data();
            return `
                <div class="recent-item">
                    <a href="detail.html#${doc.id}" class="recent-link">${data.name}</a>
                    <div class="recent-meta">
                        <span>${data.updatedBy || '익명'}</span>
                        <span>${new Date(data.updatedAt?.seconds * 1000 || data.updatedAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                    </div>
                </div>`;
        }).join('');
    } catch (e) { list.innerHTML = ''; }
}

window.addEventListener('load', () => setTimeout(loadDetail, 100));
window.addEventListener('hashchange', loadDetail);
