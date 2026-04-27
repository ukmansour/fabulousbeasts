import { db, auth } from './firebase-config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { CHARACTERS } from './data.js';

const charId = location.hash.substring(1);
const contentArea = document.getElementById('wiki-content');
const infoboxArea = document.getElementById('infobox-wrap');
const tocArea = document.getElementById('toc-content');
const tocWrapper = document.getElementById('wiki-toc');

// 헤더 검색바 작동을 위해 추가
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
    const editBtnWrap = document.getElementById('edit-btn-wrap');
    if (user && editBtnWrap) {
        editBtnWrap.innerHTML = `<a href="edit.html#${charId}" class="wiki-tab active">문서 편집</a>`;
    }
});

async function loadDetail() {
    if (!charId) {
        contentArea.innerHTML = '<h2>캐릭터 ID가 없습니다.</h2>';
        return;
    }

    // 1. 기본 데이터 (data.js)
    const baseData = CHARACTERS.find(c => c.id === charId) || { id: charId, name: charId };

    // 먼저 기본 데이터로 화면 표시
    renderInfobox(baseData);
    renderContent(baseData.details || '불러오는 중...');

    try {
        // 2. Firestore 데이터 비동기 로딩
        const snap = await getDoc(doc(db, "characters", charId));
        if (snap.exists()) {
            const dbData = snap.data();
            const data = { ...baseData, ...dbData };

            document.title = `${data.name} - 유수언 위키`;
            document.getElementById('display-name').textContent = data.name;
            
            const date = data.updatedAt?.seconds ? new Date(data.updatedAt.seconds * 1000) : new Date(data.updatedAt);
            document.getElementById('last-edit').textContent = isNaN(date) ? '최근' : date.toLocaleString();
            document.getElementById('last-editor').textContent = data.updatedBy || '시스템';

            renderInfobox(data);
            renderContent(data.details || '본문 내용이 없습니다. 편집을 통해 내용을 채워주세요.');
        } else {
            // Firestore에 데이터가 없더라도 기본 데이터로 최종 유지
            document.title = `${baseData.name} - 유수언 위키`;
            document.getElementById('display-name').textContent = baseData.name;
            renderContent(baseData.details || '본문 내용이 없습니다. 편집을 통해 내용을 채워주세요.');
        }
    } catch (e) {
        console.error("Firestore load failed in detail page:", e);
        // 에러 발생 시에도 기본 데이터는 유지됨
    }
}

function renderInfobox(data) {
    infoboxArea.innerHTML = `
        <div class="infobox">
            <div class="infobox-title">${data.name || data.id}</div>
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
    if (!details) return;
    
    // ## 섹션 -> h2, ### 섹션 -> h3 로 변환
    let html = details
        .replace(/^## (.*$)/gim, '<h2 id="$1">$1</h2>')
        .replace(/^### (.*$)/gim, '<h3 id="$1">$1</h3>')
        .replace(/\n/g, '<br>');

    contentArea.innerHTML = html;
    generateTOC();
}

function generateTOC() {
    const headers = contentArea.querySelectorAll('h2, h3');
    if (headers.length === 0) {
        tocWrapper.style.display = 'none';
        return;
    }

    tocWrapper.style.display = 'block';
    let tocHtml = '<ul>';
    headers.forEach((h, idx) => {
        const level = h.tagName === 'H2' ? 1 : 2;
        const id = h.textContent.replace(/\s+/g, '_');
        h.id = id;
        
        tocHtml += `<li style="margin-left: ${level === 2 ? '1rem' : '0'}">
            <a href="#${id}">${h.textContent}</a>
        </li>`;
    });
    tocHtml += '</ul>';
    tocArea.innerHTML = tocHtml;
}

window.onhashchange = () => location.reload();
loadDetail();
