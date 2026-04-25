import { CHARACTERS, DETAIL_SECTIONS } from './data.js';
import { db, auth } from './firebase-config.js';
import { doc, getDoc, collection, query, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// 마크다운 파서 로드
const script = document.createElement('script');
script.src = "https://cdn.jsdelivr.net/npm/marked/marked.min.js";
document.head.appendChild(script);

let currentUserID = null;

// 유저 상태 관리
onAuthStateChanged(auth, (user) => {
    const userInfo = document.getElementById('user-info');
    if (!userInfo) return;
    if (user) {
        currentUserID = user.uid;
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

    let char = CHARACTERS.find(c => c.id === charId);
    try {
        const docRef = doc(db, "characters", charId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) char = { ...char, ...docSnap.data() };
    } catch (e) { console.warn(e); }

    if (!char) {
        renderNotFound(container, charId);
        return;
    }

    document.title = `${char.name} - 유수언 위키`;
    renderWikiArticle(char);
    renderRecentChanges();
    initSearch();
}

function renderWikiArticle(char) {
    const container = document.getElementById('detail-container');
    const actionTabs = document.getElementById('action-tabs');

    // 탭 주입
    actionTabs.innerHTML = `
        <a href="edit.html#${char.id}" class="wiki-tab">편집</a>
        <div class="wiki-tab">역사</div>
    `;

    // 마크다운 & 위키링크 파서
    const parseWikiText = (text) => {
        if (!text) return '';
        // [[ID|표시명]] 또는 [[ID]] 처리
        let parsed = text.replace(/\[\[([^|\]]+)(?:\|([^\]]+))?\]\]/g, (match, id, label) => {
            const targetId = id.trim();
            const displayLabel = (label || id).trim();
            return `<a href="detail.html#${targetId}">${displayLabel}</a>`;
        });
        return typeof marked !== 'undefined' ? marked.parse(parsed) : parsed;
    };

    const activeSections = DETAIL_SECTIONS.filter(s => char[s.id] && char[s.id].trim() !== '');

    // 목차 생성
    const tocHtml = activeSections.length > 1 ? `
        <div class="wiki-toc">
            <div class="wiki-toc-title">목차</div>
            <ul>
                ${activeSections.map((s, i) => `<li><a href="#s-${s.id}">${s.label}</a></li>`).join('')}
            </ul>
        </div>
    ` : '';

    // 본문 섹션
    const sectionsHtml = activeSections.map(s => {
        let content = '';
        if (s.id === 'gallery') {
            const imgs = char[s.id].split('\n').filter(u => u.trim().startsWith('http'));
            content = `<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(150px,1fr)); gap:1rem;">
                ${imgs.map(img => `<img src="${img.trim()}" style="width:100%; border-radius:4px; cursor:pointer;" onclick="window.open(this.src)">`).join('')}
            </div>`;
        } else {
            content = parseWikiText(char[s.id]);
        }
        return `<div class="detail-section" id="s-${s.id}"><h2>${s.label}</h2><div class="wiki-content">${content}</div></div>`;
    }).join('');

    container.innerHTML = `
        <h1 class="wiki-title">${char.name}</h1>
        <div class="wiki-subtitle">최근 수정 시각: ${char.updatedAt ? new Date(char.updatedAt.seconds * 1000 || char.updatedAt).toLocaleString() : '기록 없음'}</div>
        
        <div class="infobox">
            <div class="infobox-title">${char.name}</div>
            <div class="infobox-image"><img src="${char.image}" alt="${char.name}"></div>
            <table class="infobox-table">
                <tr><th>별명</th><td>${char.nickname || '-'}</td></tr>
                <tr><th>종족</th><td>${char.species || '-'}</td></tr>
                <tr><th>성별</th><td>${char.gender || '-'}</td></tr>
                <tr><th>국적</th><td>${char.nationality || '-'}</td></tr>
                <tr><th>생일</th><td>${char.birthday || '-'}</td></tr>
                <tr><th>키</th><td>${char.height || '-'}</td></tr>
            </table>
        </div>

        <p>${char.title || ''}</p>
        ${tocHtml}
        <div style="clear: both;"></div>
        ${sectionsHtml}
    `;
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
                        <span>${new Date(data.updatedAt?.seconds * 1000 || data.updatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                </div>
            `;
        }).join('');
    } catch (e) { list.innerHTML = '<p style="font-size:0.7rem; color:red;">불러오기 실패</p>'; }
}

function initSearch() {
    const input = document.getElementById('global-search');
    const results = document.getElementById('search-results');
    if (!input) return;

    input.oninput = () => {
        const val = input.value.trim().toLowerCase();
        if (val.length < 1) { results.classList.remove('active'); return; }
        
        const matches = CHARACTERS.filter(c => c.name.toLowerCase().includes(val) || c.id.toLowerCase().includes(val)).slice(0, 8);
        if (matches.length > 0) {
            results.innerHTML = matches.map(m => `<div class="search-item" onclick="location.href='detail.html#${m.id}'">${m.name} (${m.category})</div>`).join('');
            results.classList.add('active');
        } else {
            results.innerHTML = `<div class="search-item">검색 결과가 없습니다.</div>`;
            results.classList.add('active');
        }
    };

    document.onclick = (e) => { if (!input.contains(e.target)) results.classList.remove('active'); };
}

function renderNotFound(container, id) {
    container.innerHTML = `
        <h1 class="wiki-title">${id}</h1>
        <div style="padding: 4rem 2rem; text-align: center; border: 1px dashed #ccc; margin-top: 2rem;">
            <p style="margin-bottom: 2rem; color: #666;">해당 문서를 찾을 수 없습니다. 직접 문서를 만드시겠습니까?</p>
            <button class="btn-primary" onclick="location.href='edit.html#${id}'">문서 만들기</button>
        </div>
    `;
}

window.addEventListener('load', () => setTimeout(loadDetail, 100));
window.addEventListener('hashchange', loadDetail);
