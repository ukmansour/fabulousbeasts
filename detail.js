import { db, auth } from './firebase-config.js';
import { doc, getDoc, collection, getDocs, setDoc, serverTimestamp, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { CHARACTERS } from './data.js';

const charId = decodeURIComponent(location.hash.substring(1));
const contentArea = document.getElementById('wiki-content');
const infoboxArea = document.getElementById('infobox-wrap');
const tocArea = document.getElementById('toc-content');
const tocWrapper = document.getElementById('wiki-toc');
const editBtn = document.getElementById('go-edit');
const displayNameArea = document.getElementById('display-name');

let currentGallery = [];
let modalElement = null;
let currentUser = null;
let userRole = 'member';
let isUserAdmin = false;

onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    const info = document.getElementById('user-info');
    if (user && info) {
        try {
            const userRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
                userRole = userSnap.data().role || 'member';
                if (userRole === 'banned') {
                    alert("계정이 차단되었습니다.");
                    document.body.innerHTML = '<div style="padding:50px; text-align:center;"><h1>접근 제한됨</h1></div>';
                    return;
                }
                isUserAdmin = userRole === 'admin';
            } else {
                const isSupremeAdmin = user.email === "hodu@youshouyan.wiki";
                const newUserData = {
                    uid: user.uid,
                    nickname: user.email ? user.email.split('@')[0] : "회원",
                    email: user.email || "",
                    role: isSupremeAdmin ? 'admin' : 'member',
                    joinedAt: serverTimestamp(),
                    contributionCount: 0
                };
                await setDoc(userRef, newUserData);
                userRole = newUserData.role;
                isUserAdmin = isSupremeAdmin;
            }
        } catch (e) {
            if (user.email === "hodu@youshouyan.wiki") isUserAdmin = true;
        }
        if (info) {
            info.innerHTML = `
                ${isUserAdmin ? `<a href="admin.html" class="nav-link" style="border:1px solid white; padding:2px 5px; border-radius:3px; margin-right:10px;">관리자</a>` : ''}
                <span style="color:white; font-size:12px;">${user.displayName || user.email.split('@')[0]}님</span>
            `;
        }
    }
    updateEditVisibility();
});

function updateEditVisibility() {
    if (editBtn) {
        const isAdmin = isUserAdmin;
        editBtn.style.opacity = (currentUser && isAdmin) ? '1' : '0.6';
        editBtn.textContent = isAdmin ? "편집" : "편집 (제한됨)";
        document.querySelectorAll('.section-edit-link').forEach(el => el.style.display = isAdmin ? 'inline-block' : 'none');
    }
}

if (editBtn) {
    editBtn.onclick = (e) => {
        e.preventDefault();
        if (!currentUser) { alert("로그인이 필요합니다."); location.href = 'auth.html'; }
        else if (userRole !== 'admin') { alert("관리자만 편집 가능합니다."); }
        else { location.href = `edit.html#${charId}`; }
    };
}

async function loadDetail() {
    if (!charId) return;
    const baseData = CHARACTERS.find(c => c.id === charId) || { id: charId, name: charId };
    
    // 초기 렌더링
    renderInfobox(baseData);
    renderContent(baseData.details || '불러오는 중...');

    try {
        const docRef = doc(db, "characters", charId);
        onSnapshot(docRef, (snap) => {
            if (snap.exists()) {
                const data = { ...baseData, ...snap.data() };
                if (displayNameArea) displayNameArea.textContent = data.name;
                document.title = data.name + " - 유수언 위키";
                
                // Firestore 데이터로 재렌더링
                renderInfobox(data);
                renderContent(data.details || '본문 내용이 없습니다.');
            }
        }, (err) => {
            console.error("Snapshot error:", err);
        });
    } catch (e) {
        console.error("Load error:", e);
    }
    renderRecentChanges();
}

function renderInfobox(data) {
    if (!infoboxArea) return;
    const gallery = data.gallery || [];
    currentGallery = gallery;

    const galleryHTML = gallery.length > 0 ? `
        <div class="wiki-gallery-wrap">
            <div class="gallery-title-row">
                <h3>갤러리</h3>
                <a href="#" class="gallery-view-btn" onclick="window.openFullGrid(); return false;">전체보기</a>
            </div>
            <div class="gallery-grid">
                ${gallery.slice(0, 4).map((url, idx) => `
                    <div class="gallery-item" onclick="window.openGallery(${idx})">
                        <img src="${url}" loading="lazy">
                    </div>
                `).join('')}
            </div>
        </div>
    ` : '';

    infoboxArea.innerHTML = `
        <div class="infobox">
            <div class="infobox-title">${data.name}</div>
            <div class="infobox-image" onclick="window.openGallery(-1)" style="cursor:zoom-in;">
                <img src="${data.image || 'https://via.placeholder.com/300x400?text=No+Image'}">
            </div>
            ${galleryHTML}
            <table class="infobox-table">
                ${data.alias ? `<tr><th>별명</th><td>${data.alias}</td></tr>` : ''}
                ${data.species ? `<tr><th>종족</th><td>${data.species}</td></tr>` : ''}
                ${data.nation ? `<tr><th>국적</th><td>${data.nation}</td></tr>` : ''}
                ${data.birthday ? `<tr><th>생일</th><td>${data.birthday}</td></tr>` : ''}
            </table>
        </div>
    `;

    if (gallery.length > 0) {
        initGalleryModal();
        updateFullGridModal(data.name, gallery);
    }
}

function updateFullGridModal(charName, gallery) {
    let modal = document.getElementById('full-grid-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'full-grid-modal';
        modal.className = 'full-grid-modal';
        document.body.appendChild(modal);
    }
    
    modal.innerHTML = `
        <div class="full-grid-header">
            <div class="full-grid-title">${charName} 갤러리</div>
            <div class="full-grid-close" onclick="window.closeFullGrid()">×</div>
        </div>
        <div class="full-grid-container">
            ${gallery.map((url, idx) => `
                <div class="grid-thumb" onclick="window.openFromGrid(${idx})">
                    <img src="${url}" loading="lazy">
                </div>
            `).join('')}
        </div>
    `;
}

window.openFullGrid = () => {
    const m = document.getElementById('full-grid-modal');
    if (m) m.classList.add('active');
    document.body.style.overflow = 'hidden';
};

window.closeFullGrid = () => {
    const m = document.getElementById('full-grid-modal');
    if (m) m.classList.remove('active');
    document.body.style.overflow = 'auto';
};

window.openFromGrid = (idx) => {
    window.closeFullGrid();
    window.openGallery(idx);
};

function initGalleryModal() {
    if (document.getElementById('gallery-modal')) return;
    const modal = document.createElement('div');
    modal.id = 'gallery-modal';
    modal.className = 'gallery-modal';
    modal.innerHTML = `
        <span class="modal-close" onclick="window.closeGallery()">×</span>
        <div class="modal-content" onclick="event.stopPropagation()"><img id="modal-img"></div>
        <div class="modal-nav" onclick="event.stopPropagation()">
            <button onclick="window.changeGallery(-1)">이전</button>
            <button onclick="window.changeGallery(1)">다음</button>
        </div>
    `;
    modal.onclick = window.closeGallery;
    document.body.appendChild(modal);
    modalElement = modal;
}

let currentIdx = 0;
let modalGallery = [];

window.openGallery = (idx) => {
    const mainImg = document.querySelector('.infobox-image img')?.src;
    modalGallery = [];
    if (mainImg) modalGallery.push(mainImg);
    if (currentGallery) modalGallery = [...modalGallery, ...currentGallery];
    
    currentIdx = idx === -1 ? 0 : (mainImg ? idx + 1 : idx);
    const img = document.getElementById('modal-img');
    if (img && modalElement) {
        img.src = modalGallery[currentIdx];
        modalElement.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
};

window.closeGallery = () => {
    if (modalElement) modalElement.classList.remove('active');
    document.body.style.overflow = 'auto';
};

window.changeGallery = (dir) => {
    if (!modalGallery.length) return;
    currentIdx = (currentIdx + dir + modalGallery.length) % modalGallery.length;
    const img = document.getElementById('modal-img');
    if (img) img.src = modalGallery[currentIdx];
};

function renderContent(details) {
    if (!contentArea) return;
    if (!details) { contentArea.innerHTML = '내용이 없습니다.'; return; }

    try {
        let html = details
            // 호환성 높은 정규식으로 교체
            .replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" style="max-width:100%; display:block; margin:20px auto; border-radius:8px;">')
            .replace(/\[(.*?)\]\((.*?)\)/g, (m, t, u) => `<a href="${u}" ${u.indexOf('http') === 0 ? 'target="_blank"' : ''}>${t}</a>`)
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/^## (.*$)/gim, `<h2><span class="header-text">$1</span><a href="edit.html#${charId}" class="section-edit-link">편집</a></h2>`)
            .replace(/^### (.*$)/gim, `<h3><span class="header-text">$1</span><a href="edit.html#${charId}" class="section-edit-link">편집</a></h3>`)
            .replace(/^---$/gim, '<hr>')
            .replace(/^[\*\-] (.*$)/gim, '<li>$1</li>')
            .replace(/\n/g, '<br>');

        html = html.replace(/(<li>.*?<\/li>)+/g, '<ul>$&</ul>');
        contentArea.innerHTML = html;
        generateTOC();
    } catch (e) {
        console.error("Render error:", e);
        contentArea.innerHTML = details;
    }
}

function generateTOC() {
    if (!contentArea || !tocArea || !tocWrapper) return;
    const headers = contentArea.querySelectorAll('h2, h3');
    if (!headers.length) { tocWrapper.style.display = 'none'; return; }
    tocWrapper.style.display = 'block';
    tocArea.innerHTML = '';
    const ul = document.createElement('ul');
    headers.forEach((h, i) => {
        const id = 'section-' + i;
        h.id = id;
        const li = document.createElement('li');
        if (h.tagName === 'H3') li.style.marginLeft = '15px';
        const a = document.createElement('a');
        a.href = '#' + id;
        a.textContent = h.querySelector('.header-text')?.textContent || h.textContent;
        a.onclick = (e) => {
            e.preventDefault();
            const target = document.getElementById(id);
            if (target) window.scrollTo({ top: target.getBoundingClientRect().top + window.pageYOffset - 70, behavior: 'smooth' });
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
        const snap = await getDocs(collection(db, "characters"));
        const data = snap.docs.map(d => d.data()).sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0)).slice(0, 8);
        list.innerHTML = data.map(d => `<div class="recent-item"><a href="detail.html#${d.id}">${d.name || d.id}</a></div>`).join('');
    } catch (e) {}
}

window.onhashchange = () => location.reload();
loadDetail();
