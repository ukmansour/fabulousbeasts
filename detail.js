import { db, auth } from './firebase-config.js';
import { doc, getDoc, collection, getDocs, setDoc, serverTimestamp, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { CHARACTERS } from './data.js';

// URL 처리: #이름 또는 #이름/갤러리
const fullHash = decodeURIComponent(location.hash.substring(1));
const isGalleryPage = fullHash.endsWith('/갤러리');
const charId = isGalleryPage ? fullHash.replace('/갤러리', '') : fullHash;

const contentArea = document.getElementById('wiki-content');
const infoboxArea = document.getElementById('infobox-wrap');
const tocWrapper = document.getElementById('wiki-toc');
const editBtn = document.getElementById('go-edit');
const displayNameArea = document.getElementById('display-name');

let currentGallery = [];
let currentUser = null;
let userRole = 'member';
let isUserAdmin = false;

onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    const info = document.getElementById('user-info');
    if (user && info) {
        try {
            const userSnap = await getDoc(doc(db, "users", user.uid));
            if (userSnap.exists()) {
                userRole = userSnap.data().role || 'member';
                isUserAdmin = userRole === 'admin';
            }
        } catch (e) { if (user.email === "hodu@youshouyan.wiki") isUserAdmin = true; }
        info.innerHTML = `
            ${isUserAdmin ? `<a href="admin.html" class="nav-link" style="border:1px solid white; padding:2px 5px; border-radius:3px; margin-right:10px;">관리자</a>` : ''}
            <span style="color:white; font-size:12px;">${user.displayName || user.email.split('@')[0]}님</span>
        `;
    }
    if (editBtn) editBtn.style.display = isUserAdmin ? 'inline-block' : 'none';
});

async function loadDetail() {
    if (!charId) return;

    // 초기 타이틀 설정
    const pageTitle = isGalleryPage ? `${charId} (갤러리)` : charId;
    if (displayNameArea) displayNameArea.textContent = pageTitle;
    document.title = `${pageTitle} - 유수언 위키`;

    // 1. 기본 데이터 로드 (data.js)
    const baseData = CHARACTERS.find(c => c.id === charId) || { id: charId, name: charId };
    
    // 2. 실시간 데이터 감시 (Firestore)
    const docRef = doc(db, "characters", charId);
    onSnapshot(docRef, (snap) => {
        let data = baseData;
        if (snap.exists()) {
            data = { ...baseData, ...snap.data() };
        }
        renderPage(data);
    }, (err) => {
        console.error("Firestore error:", err);
        renderPage(baseData);
    });

    renderRecentChanges();
}

function renderPage(data) {
    if (isGalleryPage) {
        renderGalleryOnlyPage(data);
    } else {
        renderNormalDetailPage(data);
    }
}

// [1] 일반 상세 페이지 렌더링
function renderNormalDetailPage(data) {
    renderInfobox(data);
    renderContent(data.details || '내용이 없습니다.');
}

// [2] 갤러리 전용 페이지 렌더링
function renderGalleryOnlyPage(data) {
    if (infoboxArea) infoboxArea.innerHTML = ''; // 갤러리 페이지에선 인포박스 제거
    if (tocWrapper) tocWrapper.style.display = 'none';
    
    const gallery = data.gallery || [];
    let html = `
        <div style="margin-bottom:20px; padding:10px; background:#f8f9fa; border-radius:4px;">
            <a href="#${charId}" style="color:var(--primary-color); font-weight:bold; text-decoration:none;">← ${charId} 문서로 돌아가기</a>
        </div>
        <p style="margin-bottom:20px; color:#666;">${charId} 문서의 모든 사진들을 보여줍니다. (총 ${gallery.length}장)</p>
        <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(200px, 1fr)); gap:15px;">
    `;
    
    if (gallery.length > 0) {
        gallery.forEach((url, idx) => {
            html += `
                <div style="aspect-ratio:1/1; border:1px solid #ddd; border-radius:8px; overflow:hidden; cursor:pointer;" onclick="window.showLarge('${url}')">
                    <img src="${url}" style="width:100%; height:100%; object-fit:cover;">
                </div>
            `;
        });
    } else {
        html += `<p style="grid-column:1/-1; padding:50px; text-align:center; color:#999;">등록된 사진이 없습니다.</p>`;
    }
    
    html += `</div>`;
    if (contentArea) contentArea.innerHTML = html;
}

function renderInfobox(data) {
    if (!infoboxArea || isGalleryPage) return;
    const gallery = data.gallery || [];
    
    const galleryHTML = gallery.length > 0 ? `
        <div class="wiki-gallery-wrap" style="margin-top:10px; border-top:1px solid #eee; padding-top:10px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <strong style="font-size:12px;">갤러리</strong>
                <a href="#${charId}/갤러리" style="font-size:11px; color:var(--primary-color); text-decoration:none;">전체보기</a>
            </div>
            <div style="display:grid; grid-template-columns:repeat(auto-fill, 70px); gap:5px;">
                ${gallery.slice(0, 4).map(url => `
                    <div style="width:70px; height:70px; border-radius:4px; overflow:hidden; cursor:pointer;" onclick="window.showLarge('${url}')">
                        <img src="${url}" style="width:100%; height:100%; object-fit:cover;">
                    </div>
                `).join('')}
            </div>
        </div>
    ` : '';

    infoboxArea.innerHTML = `
        <div class="infobox" style="float:right; width:280px; border:1px solid var(--primary-color); margin-left:20px; background:white;">
            <div style="background:var(--primary-color); color:white; padding:8px; text-align:center; font-weight:bold;">${data.name || charId}</div>
            <div style="padding:10px; text-align:center; border-bottom:1px solid #eee;" onclick="window.showLarge('${data.image}')">
                <img src="${data.image || 'https://via.placeholder.com/300x400?text=No+Image'}" style="max-width:100%; cursor:zoom-in;">
            </div>
            <div style="padding:10px;">
                <table style="width:100%; font-size:13px; border-collapse:collapse;">
                    ${data.alias ? `<tr><th style="background:#f4f4f4; width:35%; padding:5px; border:1px solid #eee; text-align:left;">별명</th><td style="padding:5px; border:1px solid #eee;">${data.alias}</td></tr>` : ''}
                    ${data.species ? `<tr><th style="background:#f4f4f4; padding:5px; border:1px solid #eee; text-align:left;">종족</th><td style="padding:5px; border:1px solid #eee;">${data.species}</td></tr>` : ''}
                    ${data.nation ? `<tr><th style="background:#f4f4f4; padding:5px; border:1px solid #eee; text-align:left;">국적</th><td style="padding:5px; border:1px solid #eee;">${data.nation}</td></tr>` : ''}
                </table>
                ${galleryHTML}
            </div>
        </div>
    `;
}

function renderContent(details) {
    if (!contentArea || isGalleryPage) return;
    
    // 복잡한 정규식 대신 안전한 변환 로직 사용
    let html = details
        .split('\n').map(line => {
            if (line.startsWith('## ')) return `<h2>${line.replace('## ', '')}</h2>`;
            if (line.startsWith('### ')) return `<h3>${line.replace('### ', '')}</h3>`;
            if (line === '---') return '<hr>';
            if (line.startsWith('* ')) return `<li>${line.replace('* ', '')}</li>`;
            return `<p>${line}</p>`;
        }).join('');

    // 간단한 마크다운 처리
    html = html
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" style="max-width:100%; border-radius:8px; display:block; margin:20px auto;">')
        .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');

    contentArea.innerHTML = html;
    generateTOC();
}

function generateTOC() {
    if (!contentArea || !tocWrapper) return;
    const headers = contentArea.querySelectorAll('h2, h3');
    if (headers.length === 0) { tocWrapper.style.display = 'none'; return; }
    tocWrapper.style.display = 'block';
    const tocList = document.getElementById('toc-content');
    if (tocList) {
        tocList.innerHTML = '';
        headers.forEach((h, i) => {
            const id = `sec-${i}`;
            h.id = id;
            const li = document.createElement('div');
            li.style.paddingLeft = h.tagName === 'H3' ? '20px' : '0';
            li.innerHTML = `<a href="#${id}" style="text-decoration:none; color:var(--text-link); font-size:14px;">${h.textContent}</a>`;
            li.onclick = (e) => {
                e.preventDefault();
                window.scrollTo({ top: h.getBoundingClientRect().top + window.pageYOffset - 70, behavior: 'smooth' });
            };
            tocList.appendChild(li);
        });
    }
}

// 사진 크게 보기 (모달 없이 새창 또는 단순 오버레이)
window.showLarge = (url) => {
    if (!url) return;
    const overlay = document.createElement('div');
    overlay.style = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); z-index:9999; display:flex; align-items:center; justify-content:center; cursor:zoom-out;';
    overlay.innerHTML = `<img src="${url}" style="max-width:95%; max-height:95%; object-fit:contain; border:2px solid white;">`;
    overlay.onclick = () => overlay.remove();
    document.body.appendChild(overlay);
};

async function renderRecentChanges() {
    const list = document.getElementById('home-recent-list');
    if (!list) return;
    try {
        const snap = await getDocs(collection(db, "characters"));
        const data = snap.docs.map(d => d.data()).sort((a,b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0)).slice(0, 5);
        list.innerHTML = data.map(d => `<div style="margin-bottom:8px;"><a href="detail.html#${d.id}" style="font-size:13px; color:var(--text-link); text-decoration:none;">${d.name || d.id}</a></div>`).join('');
    } catch(e) {}
}

window.onhashchange = () => location.reload();
loadDetail();
