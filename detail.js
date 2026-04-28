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
let userRole = 'member';

onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    const info = document.getElementById('user-info');
    if (user && info) {
        info.innerHTML = `<span style="color:white; font-size:0.75rem; margin-right:0.4rem;">${user.displayName}님</span>`;
        try {
            const userSnap = await getDoc(doc(db, "users", user.uid));
            if (userSnap.exists()) {
                userRole = userSnap.data().role || 'member';
            }
        } catch (e) { console.error("Error fetching user role:", e); }
    }
    updateEditVisibility();
});

function updateEditVisibility() {
    const canEdit = userRole === 'admin' || userRole === 'editor';
    if (!canEdit) {
        // 본문의 섹션 편집 링크 숨기기
        document.querySelectorAll('.section-edit-link').forEach(el => el.style.display = 'none');
        // 상단 편집 버튼 스타일 변경 (선택 사항)
        if (editBtn) {
            editBtn.title = "편집 권한이 없습니다.";
            // 완전히 숨기거나 비활성 시각 효과를 줄 수 있음
        }
    } else {
        document.querySelectorAll('.section-edit-link').forEach(el => el.style.display = 'inline-block');
    }
}

// 편집 버튼 클릭 시
if (editBtn) {
    editBtn.onclick = (e) => {
        e.preventDefault();
        if (!currentUser) {
            alert("편집을 위해 로그인이 필요합니다.");
            location.href = 'auth.html';
        } else if (userRole !== 'admin' && userRole !== 'editor') {
            alert("🔒 이 문서는 잠겨 있습니다. 허가된 편집자만 수정할 수 있습니다.");
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
    // ## 제목 -> <h2>제목 <a href="edit.html#id" class="section-edit-link">[편집]</a></h2> 형식으로 변경
    let html = details
        .replace(/^## (.*$)/gim, (match, p1) => {
            const cleanTitle = p1.trim();
            return `<h2><span class="header-text">${cleanTitle}</span><a href="edit.html#${charId}" class="section-edit-link">편집</a></h2>`;
        })
        .replace(/^### (.*$)/gim, (match, p1) => {
            const cleanTitle = p1.trim();
            return `<h3><span class="header-text">${cleanTitle}</span><a href="edit.html#${charId}" class="section-edit-link">편집</a></h3>`;
        })
        .replace(/\n/g, '<br>');

    contentArea.innerHTML = html;
    generateTOC();
}

function generateTOC() {
    const headers = contentArea.querySelectorAll('h2, h3');
    if (headers.length === 0) { tocWrapper.style.display = 'none'; return; }
    tocWrapper.style.display = 'block';
    let tocHtml = '<ul>';
    headers.forEach((h, index) => {
        const level = h.tagName === 'H2' ? 1 : 2;
        const headerText = h.querySelector('.header-text').textContent;
        const id = `section-${index}`; // 텍스트 대신 인덱스로 안전하게 ID 생성
        h.id = id;
        tocHtml += `<li style="margin-left: ${level === 2 ? '1rem' : '0'}"><a href="#${id}">${headerText}</a></li>`;
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
