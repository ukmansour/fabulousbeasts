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
    const canEdit = userRole === 'admin';
    if (!canEdit) {
        // 본문의 섹션 편집 링크 숨기기
        document.querySelectorAll('.section-edit-link').forEach(el => el.style.display = 'none');
        if (editBtn) {
            editBtn.style.opacity = '0.5';
            editBtn.title = "관리자만 편집 가능합니다.";
        }
    } else {
        document.querySelectorAll('.section-edit-link').forEach(el => el.style.display = 'inline-block');
        if (editBtn) {
            editBtn.style.opacity = '1';
            editBtn.title = "문서 편집";
        }
    }
}

// 편집 버튼 클릭 시
if (editBtn) {
    editBtn.onclick = (e) => {
        e.preventDefault();
        if (!currentUser) {
            alert("편집을 위해 로그인이 필요합니다.");
            location.href = 'auth.html';
        } else if (userRole !== 'admin') {
            alert("🔒 관리자 전용 문서입니다. 관리자 계정으로 로그인해주세요.");
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
            document.title = `${data.name} - 유수언`;
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
        // 1. 이미지: ![설명](주소) 또는 단순 URL (http...jpg/png/webp)
        .replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" style="max-width:100%; border-radius:8px; margin: 10px 0; display:block;">')
        .replace(/(?<!["'])(https?:\/\/[^\s<]+?\.(?:jpg|jpeg|gif|png|webp|svg))(?![^<]*>|[^<>]*<\/a>)/gi, '<img src="$1" style="max-width:100%; border-radius:8px; margin: 10px 0; display:block;">')
        
        // 2. 링크: [텍스트](주소)
        .replace(/\[(.*?)\]\((.*?)\)/g, (match, text, url) => {
            if (url.startsWith('#') || url.includes('.html')) return `<a href="${url}">${text}</a>`;
            return `<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>`;
        })

        // 3. 굵게: **텍스트** 또는 __텍스트__
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/__(.*?)__/g, '<strong>$1</strong>')

        // 4. 기울임: *텍스트* 또는 _텍스트_
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/_(.*?)_/g, '<em>$1</em>')

        // 5. 제목 (H2, H3)
        .replace(/^## (.*$)/gim, (match, p1) => {
            const cleanTitle = p1.trim();
            return `<h2><span class="header-text">${cleanTitle}</span><a href="edit.html#${charId}" class="section-edit-link">편집</a></h2>`;
        })
        .replace(/^### (.*$)/gim, (match, p1) => {
            const cleanTitle = p1.trim();
            return `<h3><span class="header-text">${cleanTitle}</span><a href="edit.html#${charId}" class="section-edit-link">편집</a></h3>`;
        })

        // 6. 구분선: ---
        .replace(/^---$/gim, '<hr>')

        // 7. 리스트: * 항목 또는 - 항목
        .replace(/^[\*\-] (.*$)/gim, '<li>$1</li>')

        // 8. 줄바꿈 처리
        .replace(/\n/g, '<br>');

    // <li> 태그들을 <ul>로 감싸기
    html = html.replace(/(<li>.*?<\/li>)+/g, '<ul>$&</ul>');

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
    tocArea.innerHTML = ''; // 기존 내용 초기화
    
    const ul = document.createElement('ul');
    headers.forEach((h, index) => {
        const level = h.tagName === 'H2' ? 1 : 2;
        const headerText = h.querySelector('.header-text').textContent;
        const id = `section-${index}`;
        h.id = id;

        const li = document.createElement('li');
        li.style.marginLeft = level === 2 ? '1rem' : '0';
        
        const a = document.createElement('a');
        a.href = `#${id}`;
        a.textContent = headerText;
        
        // 해시 변경으로 인한 페이지 리로드 방지 (중요)
        a.onclick = (e) => {
            e.preventDefault();
            const target = document.getElementById(id);
            if (target) {
                const headerOffset = 70; // 헤더 높이만큼 보정
                const elementPosition = target.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: "smooth"
                });
            }
        };
        
        li.appendChild(a);
        ul.appendChild(li);
    });
    tocArea.appendChild(ul);
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
