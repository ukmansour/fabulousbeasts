import { db, auth } from './firebase-config.js';
import { doc, getDoc, collection, getDocs, setDoc, serverTimestamp, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { CHARACTERS } from './data.js';

// URL 처리
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

// 권한 확인 및 마스터 관리자 예외 처리
onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    userRole = 'member';
    isUserAdmin = false;
    const info = document.getElementById('user-info');

    if (user) {
        // [중요] 마스터 관리자 계정은 즉시 admin 권한 부여
        if (user.email === "hodu@youshouyan.wiki") {
            userRole = 'admin';
            isUserAdmin = true;
        }

        try {
            const userSnap = await getDoc(doc(db, "users", user.uid));
            if (userSnap.exists()) {
                const dbRole = userSnap.data().role || 'member';
                // DB에 정보가 있으면 갱신 (마스터 계정은 이미 true이므로 유지됨)
                if (dbRole === 'admin') {
                    userRole = 'admin';
                    isUserAdmin = true;
                } else if (dbRole === 'banned') {
                    alert("계정이 차단되었습니다.");
                    document.body.innerHTML = '<div style="padding:50px; text-align:center;"><h1>접근 제한됨</h1></div>';
                    return;
                }
            }
        } catch (e) { console.error("Auth role check error:", e); }

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
        // 관리자라면 버튼 표시, 아니면 숨김
        editBtn.style.display = isUserAdmin ? 'inline-block' : 'none';
        editBtn.style.opacity = '1';
    }
}

if (editBtn) {
    editBtn.onclick = (e) => {
        e.preventDefault();
        if (!currentUser) { 
            alert("편집을 위해 로그인이 필요합니다."); 
            location.href = 'auth.html'; 
        } else if (!isUserAdmin) { 
            alert("🔒 관리자 권한이 필요합니다."); 
        } else { 
            location.href = `edit.html#${charId}`; 
        }
    };
}

async function loadDetail() {
    if (!charId) return;
    const pageTitle = isGalleryPage ? `${charId} (갤러리)` : charId;
    if (displayNameArea) displayNameArea.textContent = pageTitle;
    document.title = `${pageTitle} - 유수언 위키`;

    const baseData = CHARACTERS.find(c => c.id === charId) || { id: charId, name: charId };
    
    // Firestore 실시간 데이터 로드
    const docRef = doc(db, "characters", charId);
    onSnapshot(docRef, (snap) => {
        let data = baseData;
        if (snap.exists()) {
            data = { ...baseData, ...snap.data() };
        }
        
        // 표시 이름 갱신 (ID가 아닌 실제 이름으로)
        const nameToDisplay = data.name || charId;
        const finalTitle = isGalleryPage ? `${nameToDisplay} (갤러리)` : nameToDisplay;
        if (displayNameArea) displayNameArea.textContent = finalTitle;
        document.title = `${finalTitle} - 유수언 위키`;

        renderPage(data);
    }, (err) => {
        console.error("Firestore loading error:", err);
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

function renderNormalDetailPage(data) {
    renderInfobox(data);
    renderContent(data.details || '내용이 없습니다.');
}

function renderGalleryOnlyPage(data) {
    if (infoboxArea) infoboxArea.innerHTML = '';
    if (tocWrapper) tocWrapper.style.display = 'none';
    
    const gallery = data.gallery || [];
    let html = `
        <div style="margin-bottom:20px; padding:10px; background:#f8f9fa; border-radius:4px; border:1px solid #eee;">
            <a href="#${charId}" style="color:var(--primary-color); font-weight:bold; text-decoration:none;">← ${charId} 본문으로 돌아가기</a>
        </div>
        <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(200px, 1fr)); gap:15px; margin-top:20px;">
    `;
    
    if (gallery.length > 0) {
        gallery.forEach((url) => {
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
        <div class="wiki-gallery-wrap" style="margin-top:15px; border-top:1px solid #eee; padding-top:10px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <strong style="font-size:12px; color:#555;">갤러리</strong>
                <a href="#${charId}/갤러리" style="font-size:11px; color:var(--primary-color); text-decoration:none;">전체보기 ></a>
            </div>
            <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:5px;">
                ${gallery.slice(0, 4).map(url => `
                    <div style="aspect-ratio:1/1; border-radius:4px; overflow:hidden; cursor:pointer;" onclick="window.showLarge('${url}')">
                        <img src="${url}" style="width:100%; height:100%; object-fit:cover;">
                    </div>
                `).join('')}
            </div>
        </div>
    ` : '';

    infoboxArea.innerHTML = `
        <div class="infobox" style="float:right; width:280px; border:1px solid var(--primary-color); margin-left:20px; background:white; position:relative; z-index:10;">
            <div style="background:var(--primary-color); color:white; padding:8px; text-align:center; font-weight:800; font-size:1rem;">${data.name || charId}</div>
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
    
    // 마크다운 변환 로직
    let html = details
        .split('\n').map(line => {
            if (line.startsWith('## ')) return `<h2>${line.replace('## ', '')}</h2>`;
            if (line.startsWith('### ')) return `<h3>${line.replace('### ', '')}</h3>`;
            if (line === '---') return '<hr>';
            if (line.startsWith('* ')) return `<li>${line.replace('* ', '')}</li>`;
            return `<p>${line}</p>`;
        }).join('');

    html = html
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" style="max-width:100%; border-radius:8px; display:block; margin:20px auto;">')
        .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');

    html = html.replace(/(<li>.*?<\/li>)+/g, '<ul>$&</ul>');
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

window.showLarge = (url) => {
    if (!url || url.includes('placeholder')) return;
    const overlay = document.createElement('div');
    overlay.style = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); z-index:9999; display:flex; align-items:center; justify-content:center; cursor:zoom-out;';
    overlay.innerHTML = `<img src="${url}" style="max-width:95%; max-height:95%; object-fit:contain; border:2px solid white; box-shadow:0 0 20px rgba(0,0,0,0.5);">`;
    overlay.onclick = () => overlay.remove();
    document.body.appendChild(overlay);
};

async function renderRecentChanges() {
    const list = document.getElementById('home-recent-list');
    if (!list) return;
    try {
        const snap = await getDocs(collection(db, "characters"));
        const data = snap.docs.map(d => d.data()).sort((a,b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0)).slice(0, 5);
        list.innerHTML = data.map(d => `<div style="margin-bottom:10px;"><a href="detail.html#${d.id}" style="font-size:13px; color:var(--text-link); text-decoration:none; font-weight:700;">${d.name || d.id}</a></div>`).join('');
    } catch(e) {}
}

window.onhashchange = () => location.reload();
loadDetail();
