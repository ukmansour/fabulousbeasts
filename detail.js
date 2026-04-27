import { db, auth } from './firebase-config.js';
import { doc, getDoc, collection, getDocs, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { CHARACTERS } from './data.js';

const charId = location.hash.substring(1);
const contentArea = document.getElementById('wiki-content');
const infoboxArea = document.getElementById('infobox-wrap');
const tocArea = document.getElementById('toc-content');
const tocWrapper = document.getElementById('wiki-toc');
const editBtn = document.getElementById('go-edit');

let currentUser = null;

// 헤더 검색바
const input = document.getElementById('global-search');
const results = document.getElementById('search-results');
if (input) {
    input.oninput = () => {
        const val = input.value.trim().toLowerCase();
        if (val.length < 1) { results.classList.remove('active'); return; }
        const matches = CHARACTERS.filter(c => (c.name||'').toLowerCase().includes(val) || c.id.toLowerCase().includes(val)).slice(0, 8);
        results.innerHTML = matches.map(m => `<div class="search-item" onclick="location.href='detail.html#${m.id}'">${m.name}</div>`).join('');
        results.classList.add('active');
    };
}

onAuthStateChanged(auth, (user) => {
    currentUser = user;
    const info = document.getElementById('user-info');
    if (user && info) {
        info.innerHTML = `<span style="color:white; font-size:0.75rem; margin-right:0.4rem;">${user.displayName}님</span>`;
    }
});

// 편집 버튼 클릭 시
if (editBtn) {
    editBtn.onclick = (e) => {
        e.preventDefault();
        if (!currentUser) {
            alert("편집을 위해 로그인이 필요합니다. (닉네임 설정)");
            location.href = 'auth.html';
        } else {
            location.href = `edit.html#${charId}`;
        }
    };
}

async function loadDetail() {
    if (!charId) return;

    // 1. 기본 데이터
    const baseData = CHARACTERS.find(c => c.id === charId) || { id: charId, name: charId };
    renderInfobox(baseData);
    renderContent(baseData.details || '불러오는 중...');

    try {
        // 2. Firestore 데이터
        const snap = await getDoc(doc(db, "characters", charId));
        if (snap.exists()) {
            const data = { ...baseData, ...snap.data() };
            document.title = `${data.name} - 유수언 위키`;
            document.getElementById('display-name').textContent = data.name;
            
            const date = data.updatedAt?.seconds ? new Date(data.updatedAt.seconds * 1000) : new Date(data.updatedAt);
            document.getElementById('last-edit').textContent = isNaN(date) ? '-' : date.toLocaleString();
            document.getElementById('last-editor').textContent = data.updatedBy || '시스템';

            renderInfobox(data);
            renderContent(data.details || '본문 내용이 없습니다.');
        } else {
            document.getElementById('display-name').textContent = baseData.name;
            renderContent(baseData.details || '본문 내용이 없습니다.');
        }
    } catch (e) { console.error(e); }

    renderRecentChanges();
}

function renderInfobox(data) {
    infoboxArea.innerHTML = `
        <div class="infobox">
            <div class="infobox-title">${data.name}</div>
            <div class="infobox-image">
                <img src="${data.image || 'https://via.placeholder.com/300x400?text=No+Image'}" alt="${data.name}">
            </div>
            <table class="infobox-table">
                ${data.alias ? `<tr><th>별명</th><td>${data.alias}</td></tr>` : ''}
                ${data.species ? `<tr><th>종족</th><td>${data.species}</td></tr>` : ''}
                ${data.nation ? `<tr><th>국적</th><td>${data.nation}</td></tr>` : ''}
                ${data.birthday ? `<tr><th>생일</th><td>${data.birthday}</td></tr>` : ''}
            </table>
        </div>
    `;
}

function renderContent(details) {
    let html = details
        .replace(/^## (.*$)/gim, '<h2 id="$1">$1</h2>')
        .replace(/^### (.*$)/gim, '<h3 id="$1">$1</h3>')
        .replace(/\n/g, '<br>');

    contentArea.innerHTML = html;
    generateTOC();
}

function generateTOC() {
    const headers = contentArea.querySelectorAll('h2, h3');
    if (headers.length === 0) { tocWrapper.style.display = 'none'; return; }
    tocWrapper.style.display = 'block';
    let tocHtml = '<ul>';
    headers.forEach(h => {
        const level = h.tagName === 'H2' ? 1 : 2;
        const id = h.textContent.replace(/\s+/g, '_');
        h.id = id;
        tocHtml += `<li style="margin-left: ${level === 2 ? '1rem' : '0'}"><a href="#${id}">${h.textContent}</a></li>`;
    });
    tocHtml += '</ul>';
    tocArea.innerHTML = tocHtml;
}

async function renderRecentChanges() {
    const list = document.getElementById('home-recent-list');
    if (!list) return;
    try {
        const q = query(collection(db, "characters"), orderBy("updatedAt", "desc"), limit(8));
        const snap = await getDocs(q);
        list.innerHTML = snap.docs.map(doc => {
            const d = doc.data();
            return `<div class="recent-item">
                <a href="detail.html#${doc.id}" class="recent-link">${d.name || doc.id}</a>
                <div class="recent-meta"><span>${d.updatedBy || '익명'}</span></div>
            </div>`;
        }).join('');
    } catch (e) { list.innerHTML = ''; }
}

window.onhashchange = () => location.reload();
loadDetail();
