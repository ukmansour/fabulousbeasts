import { CHARACTERS, DETAIL_SECTIONS } from './data.js';
import { db, auth } from './firebase-config.js';
import { doc, getDoc, collection, query, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// 마크다운 파서 로드
const script = document.createElement('script');
script.src = "https://cdn.jsdelivr.net/npm/marked/marked.min.js";
document.head.appendChild(script);

let allCharacters = [...CHARACTERS];

onAuthStateChanged(auth, (user) => {
    const userInfo = document.getElementById('user-info');
    if (!userInfo) return;
    if (user) {
        userInfo.innerHTML = `<span style="color:white; font-size:0.8rem; margin-right:0.5rem;">${user.displayName || '유저'}님</span>
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

    // 1. Firestore에서 최신 데이터 우선 로드
    let char = null;
    try {
        const docRef = doc(db, "characters", charId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            char = { id: charId, ...docSnap.data() };
        } else {
            // 2. 없으면 로컬 데이터에서 찾기
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
            ? `<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(150px,1fr)); gap:1rem;">
                ${char[s.id].split('\n').filter(u => u.trim().startsWith('http')).map(img => `<img src="${img.trim()}" style="width:100%; border-radius:4px; cursor:pointer;" onclick="window.open(this.src)">`).join('')}
               </div>`
            : parseWikiText(char[s.id]);
        return `<div class="detail-section" id="s-${s.id}"><h2>${s.label}</h2><div class="wiki-content">${content}</div></div>`;
    }).join('');

    container.innerHTML = `
        <h1 class="wiki-title">${char.name}</h1>
        <div class="wiki-subtitle">최근 수정: ${char.updatedAt ? new Date(char.updatedAt.seconds * 1000 || char.updatedAt).toLocaleString() : '기록 없음'}</div>
        <div class="infobox">
            <div class="infobox-title">${char.name}</div>
            <div class="infobox-image"><img src="${char.image || 'https://via.placeholder.com/300?text=No+Image'}" alt="${char.name}"></div>
            <table class="infobox-table">
                ${['nickname', 'species', 'gender', 'nationality', 'birthday', 'height'].map(k => `<tr><th>${k}</th><td>${char[k] || '-'}</td></tr>`).join('')}
            </table>
        </div>
        <p>${char.title || ''}</p>
        ${tocHtml}<div style="clear:both;"></div>${sectionsHtml || '<p style="color:#999; padding:2rem; text-align:center; border:1px dashed #ddd; margin-top:2rem;">내용이 없습니다. 편집을 통해 내용을 채워주세요!</p>'}`;
}

function renderNotFound(container, id) {
    container.innerHTML = `
        <h1 class="wiki-title">${id}</h1>
        <div style="padding: 5rem 2rem; text-align: center; background: #fff; border: 1px dashed var(--border-color); margin-top: 2rem;">
            <p style="font-size: 1.2rem; color: #666; margin-bottom: 2rem;">"<strong>${id}</strong>" 문서가 아직 없습니다. 직접 만도시겠습니까?</p>
            <button class="btn-primary" style="padding: 1rem 3rem;" onclick="location.href='edit.html#${id}'">문서 만들기</button>
        </div>`;
}

async function initSearch() {
    const input = document.getElementById('global-search');
    const results = document.getElementById('search-results');
    if (!input) return;

    // Firestore에서 모든 캐릭터 ID/이름 리스트 가져오기 (검색용)
    const snap = await getDocs(collection(db, "characters"));
    const firestoreChars = snap.docs.map(d => ({ id: d.id, name: d.data().name }));
    const combined = [...CHARACTERS];
    firestoreChars.forEach(fc => { if(!combined.find(c => c.id === fc.id)) combined.push(fc); });

    input.oninput = () => {
        const val = input.value.trim().toLowerCase();
        if (val.length < 1) { results.classList.remove('active'); return; }
        const matches = combined.filter(c => c.name.toLowerCase().includes(val) || c.id.toLowerCase().includes(val)).slice(0, 10);
        results.innerHTML = matches.length > 0 
            ? matches.map(m => `<div class="search-item" onclick="location.href='detail.html#${m.id}'">${m.name} (${m.id})</div>`).join('')
            : `<div class="search-item" onclick="location.href='edit.html#${val}'">"${val}" 문서 만들기</div>`;
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
        list.innerHTML = snap.docs.map(doc => `<div class="recent-item"><a href="detail.html#${doc.id}" class="recent-link">${doc.data().name}</a><div class="recent-meta"><span>${doc.data().updatedBy || '익명'}</span></div></div>`).join('');
    } catch (e) { list.innerHTML = ''; }
}

window.addEventListener('load', () => setTimeout(loadDetail, 100));
window.addEventListener('hashchange', loadDetail);
