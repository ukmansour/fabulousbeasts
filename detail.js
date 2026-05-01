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
let isUserAdmin = false; // 전역 변수로 관리

onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    const info = document.getElementById('user-info');
    if (user && info) {
        try {
            const userRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
                const userData = userSnap.data();
                userRole = userData.role || 'member';
                if (userRole === 'banned') {
                    alert("⚠️ 귀하의 계정은 차단되었습니다.");
                    document.body.innerHTML = `
                        <div style="height:100vh; display:flex; flex-direction:column; justify-content:center; align-items:center; background:#f8f9fa; font-family:sans-serif;">
                            <h1 style="color:#dc2626; font-size:3rem; margin-bottom:1rem;">🚫 접근 차단됨</h1>
                            <p style="font-size:1.2rem; color:#666;">관리자에 의해 이용 권한이 제한되었습니다.</p>
                            <button onclick="auth.signOut().then(() => location.reload())" style="margin-top:2rem; padding:0.8rem 2rem; background:#4b5563; color:white; border:none; border-radius:4px; cursor:pointer; font-weight:bold;">로그아웃</button>
                        </div>
                    `;
                    return;
                }
                isUserAdmin = userRole === 'admin';
            } else {
                const isSupremeAdmin = user.email === "hodu@youshouyan.wiki";
                const autoNickname = user.email ? user.email.split('@')[0] : (user.displayName || "회원");
                const newUserData = {
                    uid: user.uid,
                    nickname: autoNickname,
                    email: user.email || "",
                    role: isSupremeAdmin ? 'admin' : 'member',
                    joinedAt: serverTimestamp(),
                    contributionCount: 0
                };
                await setDoc(userRef, newUserData);
                userRole = isSupremeAdmin ? 'admin' : 'member';
                isUserAdmin = isSupremeAdmin;
            }
        } catch (e) { 
            console.error("Error fetching user role:", e);
            if (user.email === "hodu@youshouyan.wiki") { userRole = 'admin'; isUserAdmin = true; }
        }

        info.innerHTML = `
            ${isUserAdmin ? `<a href="admin.html" class="nav-link" style="color:white; font-weight:bold; margin-right:1rem; border:1px solid rgba(255,255,255,0.3); padding:0.2rem 0.5rem; border-radius:3px;">관리자 설정</a>` : ''}
            <span style="color:white; font-size:0.75rem; margin-right:0.4rem;">${user.displayName || user.email.split('@')[0]}님</span>
        `;
    }
    updateEditVisibility();
});

function updateEditVisibility() {
    const isAdmin = isUserAdmin;
    const isLoggedIn = currentUser !== null;

    if (editBtn) {
        if (!isLoggedIn) {
            editBtn.textContent = "로그인 후 편집";
            editBtn.style.opacity = '1';
            editBtn.style.color = 'var(--primary-color)';
        } else if (!isAdmin) {
            editBtn.textContent = "편집 (권한 제한)";
            editBtn.style.opacity = '0.5';
        } else {
            editBtn.textContent = "편집";
            editBtn.style.opacity = '1';
            editBtn.style.color = '';
        }
    }

    document.querySelectorAll('.section-edit-link').forEach(el => {
        el.style.display = isAdmin ? 'inline-block' : 'none';
    });
}

if (editBtn) {
    editBtn.onclick = (e) => {
        e.preventDefault();
        if (!currentUser) {
            alert("편집을 위해 로그인이 필요합니다.");
            location.href = 'auth.html';
        } else if (userRole !== 'admin') {
            alert("🔒 관리자 전용 문서입니다.");
        } else {
            location.href = `edit.html#${charId}`;
        }
    };
}

async function loadDetail() {
    if (!charId) return;

    const baseData = CHARACTERS.find(c => c.id === charId) || { id: charId, name: charId };
    renderInfobox(baseData);
    renderContent(baseData.details || '불러오는 중...');

    try {
        const docRef = doc(db, "characters", charId);
        onSnapshot(docRef, (snap) => {
            if (snap.exists()) {
                const dbData = snap.data();
                const data = { ...baseData, ...dbData };
                
                document.title = `${data.name || charId} - 유수언 위키`;
                if (displayNameArea) displayNameArea.textContent = data.name || charId;
                
                const date = data.updatedAt?.seconds ? new Date(data.updatedAt.seconds * 1000) : new Date();
                const lastEdit = document.getElementById('last-edit');
                const lastEditor = document.getElementById('last-editor');
                if (lastEdit) lastEdit.textContent = date.toLocaleString();
                if (lastEditor) lastEditor.textContent = data.updatedBy || '시스템';

                renderInfobox(data);
                renderContent(data.details || '본문 내용이 없습니다.');
            }
        });
    } catch (e) { 
        console.error("LoadDetail error:", e); 
    }
    renderRecentChanges();
}

function renderInfobox(data) {
    if (!infoboxArea) return;
    const gallery = data.gallery && Array.isArray(data.gallery) && data.gallery.length > 0 ? data.gallery : null;
    if (gallery) currentGallery = gallery;

    const galleryHTML = gallery ? `
        <div class="wiki-gallery-wrap" style="border-bottom: 1px solid #eee; padding-bottom: 0.8rem; margin-bottom: 0.5rem;">
            <div class="gallery-title-row">
                <h3>갤러리</h3>
                <a href="#" class="gallery-view-btn" onclick="window.openFullGrid(); return false;">갤러리 보기 (${gallery.length}장)</a>
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
            <div class="infobox-image" onclick="window.openGallery(-1)" style="cursor: zoom-in;">
                <img src="${data.image || 'https://via.placeholder.com/300x400?text=No+Image'}" alt="${data.name}">
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

    if (gallery) {
        initGalleryModal();
        initFullGridModal(data.name, gallery);
    }
}

function renderGallery(gallery) {} // 하위 호환

function initFullGridModal(charName, gallery) {
    let existing = document.getElementById('full-grid-modal');
    if (existing) existing.remove();
    
    const modal = document.createElement('div');
    modal.id = 'full-grid-modal';
    modal.className = 'full-grid-modal';
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
    document.body.appendChild(modal);
}

window.openFullGrid = () => {
    const modal = document.getElementById('full-grid-modal');
    if (modal) modal.classList.add('active');
    document.body.style.overflow = 'hidden';
};

window.closeFullGrid = () => {
    const modal = document.getElementById('full-grid-modal');
    if (modal) modal.classList.remove('active');
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
        <div class="modal-content" onclick="event.stopPropagation()">
            <img id="modal-img" src="">
        </div>
        <div class="modal-nav" onclick="event.stopPropagation()">
            <button class="modal-nav-btn" onclick="window.changeGallery(-1)">이전</button>
            <button class="modal-nav-btn" onclick="window.changeGallery(1)">다음</button>
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
    document.getElementById('modal-img').src = modalGallery[currentIdx];
};

function renderContent(details) {
    if (!details || !contentArea) return;
    let html = details
        .replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" style="max-width:100%; max-height:600px; object-fit:contain; border-radius:8px; margin: 20px auto; display:block;">')
        .replace(/(?<!["'])(https?:\/\/[^\s<]+?\.(?:jpg|jpeg|gif|png|webp|svg))(?![^<]*>|[^<>]*<\/a>)/gi, '<img src="$1" style="max-width:100%; max-height:600px; object-fit:contain; border-radius:8px; margin: 20px auto; display:block;">')
        .replace(/\[(.*?)\]\((.*?)\)/g, (match, text, url) => {
            if (url.startsWith('#') || url.includes('.html')) return `<a href="${url}">${text}</a>`;
            return `<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>`;
        })
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/^## (.*$)/gim, '<h2><span class="header-text">$1</span><a href="edit.html#${charId}" class="section-edit-link">편집</a></h2>')
        .replace(/^### (.*$)/gim, '<h3><span class="header-text">$1</span><a href="edit.html#${charId}" class="section-edit-link">편집</a></h3>')
        .replace(/^---$/gim, '<hr>')
        .replace(/^[\*\-] (.*$)/gim, '<li>$1</li>')
        .replace(/\n/g, '<br>');

    html = html.replace(/(<li>.*?<\/li>)+/g, '<ul>$&</ul>');
    contentArea.innerHTML = html;
    generateTOC();
}

function generateTOC() {
    if (!contentArea || !tocWrapper || !tocArea) return;
    const headers = contentArea.querySelectorAll('h2, h3');
    if (headers.length === 0) {
        tocWrapper.style.display = 'none';
        return;
    }
    tocWrapper.style.display = 'block';
    tocArea.innerHTML = '';
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
        a.onclick = (e) => {
            e.preventDefault();
            const target = document.getElementById(id);
            if (target) {
                window.scrollTo({ top: target.getBoundingClientRect().top + window.pageYOffset - 70, behavior: "smooth" });
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
        const snap = await getDocs(collection(db, "characters"));
        const sorted = snap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .sort((a, b) => (b.updatedAt?.seconds ?? 0) - (a.updatedAt?.seconds ?? 0))
            .slice(0, 8);
        list.innerHTML = sorted.map(d => `
            <div class="recent-item">
                <a href="detail.html#${d.id}" class="recent-link">${d.name || d.id}</a>
                <div class="recent-meta">
                    <span>${d.updatedBy || '익명'}</span>
                </div>
            </div>`).join('');
    } catch (e) {}
}

window.onhashchange = () => location.reload();
loadDetail();
