import { db, auth } from './firebase-config.js';
import { doc, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
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

onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    const info = document.getElementById('user-info');
    if (user && info) {
        let isAdmin = false;
        try {
            const userSnap = await getDoc(doc(db, "users", user.uid));
            if (userSnap.exists()) {
                userRole = userSnap.data().role || 'member';
                isAdmin = userRole === 'admin';
            }
        } catch (e) { console.error("Error fetching user role:", e); }

        info.innerHTML = `
            ${isAdmin ? `<a href="admin.html" class="nav-link" style="color:white; font-weight:bold; margin-right:1rem; border:1px solid rgba(255,255,255,0.3); padding:0.2rem 0.5rem; border-radius:3px;">관리자 설정</a>` : ''}
            <span style="color:white; font-size:0.75rem; margin-right:0.4rem;">${user.displayName}님</span>
        `;
    }
    updateEditVisibility();
});

function updateEditVisibility() {
    const isAdmin = userRole === 'admin';
    const isLoggedIn = currentUser !== null;

    if (editBtn) {
        if (!isLoggedIn) {
            editBtn.textContent = "로그인 후 편집";
            editBtn.style.opacity = '1';
            editBtn.style.color = 'var(--primary-color)';
            editBtn.title = "편집하려면 로그인이 필요합니다.";
        } else if (!isAdmin) {
            editBtn.textContent = "편집 (권한 제한)";
            editBtn.style.opacity = '0.5';
            editBtn.title = "관리자만 편집 가능합니다.";
        } else {
            editBtn.textContent = "편집";
            editBtn.style.opacity = '1';
            editBtn.style.color = '';
            editBtn.title = "문서 편집";
        }
    }

    // 본문의 섹션 편집 링크 숨기기
    document.querySelectorAll('.section-edit-link').forEach(el => {
        if (!isAdmin) {
            el.style.display = 'none';
        } else {
            el.style.display = 'inline-block';
        }
    });
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
        console.log("Fetching Firestore data for:", charId);
        const docRef = doc(db, "characters", charId);
        
        onSnapshot(docRef, (snap) => {
            if (snap.exists()) {
                const dbData = snap.data();
                console.log("Firestore data received:", dbData);
                const data = { ...baseData, ...dbData };
                
                document.title = `${data.name || charId} - 유수언`;
                document.getElementById('display-name').textContent = data.name || charId;
                
                const date = data.updatedAt?.seconds ? new Date(data.updatedAt.seconds * 1000) : new Date(data.updatedAt);
                document.getElementById('last-edit').textContent = isNaN(date) ? '-' : date.toLocaleString();
                document.getElementById('last-editor').textContent = data.updatedBy || '시스템';

                renderInfobox(data);
                renderGallery(data.gallery);
                renderContent(data.details || '본문 내용이 없습니다.');
            } else {
                // [폴백] 인코딩된 ID로도 시도 (이전 버전 호환성)
                const rawId = location.hash.substring(1);
                if (rawId !== charId) {
                    console.log("Trying fallback with raw ID:", rawId);
                    getDoc(doc(db, "characters", rawId)).then(fallbackSnap => {
                        if (fallbackSnap.exists()) {
                            const data = { ...baseData, ...fallbackSnap.data() };
                            renderInfobox(data);
                            renderContent(data.details || '본문 내용이 없습니다.');
                        } else {
                            console.log("No Firestore document found for both decoded and raw ID.");
                            document.getElementById('display-name').textContent = baseData.name;
                            renderContent(baseData.details || '본문 내용이 없습니다.');
                        }
                    });
                } else {
                    console.log("No Firestore document found for:", charId);
                    document.getElementById('display-name').textContent = baseData.name;
                    renderContent(baseData.details || '본문 내용이 없습니다.');
                }
            }
        }, (error) => {
            console.error("Snapshot error:", error);
            alert("데이터를 불러오는 중 오류가 발생했습니다: " + error.message);
        });
    } catch (e) { 
        console.error("LoadDetail error:", e); 
        alert("상세 페이지 로딩 실패: " + e.message);
    }

    renderRecentChanges();
}

function renderInfobox(data) {
    const gallery = data.gallery && Array.isArray(data.gallery) && data.gallery.length > 0 ? data.gallery : null;
    
    if (gallery) {
        currentGallery = gallery;
    }

    const galleryHTML = gallery ? `
        <div class="wiki-gallery-wrap" style="border-bottom: 1px solid #eee; padding-bottom: 0.8rem; margin-bottom: 0.5rem;">
            <div class="gallery-title-row">
                <h3>갤러리</h3>
                <a href="#" class="gallery-view-btn" onclick="window.openGallery(0); return false;">갤러리 보기 (${gallery.length}장)</a>
            </div>
            <div class="gallery-grid">
                ${gallery.slice(0, 3).map((url, idx) => `
                    <div class="gallery-item" onclick="window.openGallery(${idx})">
                        <img src="${url}" alt="갤러리 ${idx + 1}" loading="lazy">
                    </div>
                `).join('')}
            </div>
        </div>
    ` : '';

    infoboxArea.innerHTML = `
        <div class="infobox">
            <div class="infobox-title">${data.name}</div>
            <div class="infobox-image">
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

    // 갤러리가 있으면 모달 초기화
    if (gallery) {
        initGalleryModal();
    }
}

function renderGallery(gallery) {
    // 이제 renderInfobox 내에서 처리하므로 이 함수는 비워둠 (하위 호환용)
}


function initGalleryModal() {
    if (document.getElementById('gallery-modal')) return;
    
    const modal = document.createElement('div');
    modal.id = 'gallery-modal';
    modal.className = 'gallery-modal';
    modal.innerHTML = `
        <span class="modal-close" onclick="window.closeGallery()">×</span>
        <div class="modal-content">
            <img id="modal-img" src="">
        </div>
        <div class="modal-nav">
            <button class="modal-nav-btn" onclick="window.changeGallery(-1)">이전</button>
            <button class="modal-nav-btn" onclick="window.changeGallery(1)">다음</button>
        </div>
    `;
    document.body.appendChild(modal);
    modalElement = modal;
}

let currentIdx = 0;
window.openGallery = (idx) => {
    currentIdx = idx;
    const img = document.getElementById('modal-img');
    if (img) {
        img.src = currentGallery[currentIdx];
        modalElement.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
};

window.closeGallery = () => {
    modalElement.classList.remove('active');
    document.body.style.overflow = 'auto';
};

window.changeGallery = (dir) => {
    currentIdx = (currentIdx + dir + currentGallery.length) % currentGallery.length;
    document.getElementById('modal-img').src = currentGallery[currentIdx];
};

function renderContent(details) {
    if (!details) return;
    try {
        let html = details
            // 1. 이미지: ![설명](주소) 또는 단순 URL (http...jpg/png/webp)
            .replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" style="max-width:100%; max-height:600px; object-fit:contain; border-radius:8px; margin: 20px auto; display:block;">')
            .replace(/(?<!["'])(https?:\/\/[^\s<]+?\.(?:jpg|jpeg|gif|png|webp|svg))(?![^<]*>|[^<>]*<\/a>)/gi, '<img src="$1" style="max-width:100%; max-height:600px; object-fit:contain; border-radius:8px; margin: 20px auto; display:block;">')
            
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
    } catch (err) {
        console.error("Rendering error:", err);
        contentArea.innerHTML = `<p style="color:red;">문서를 렌더링하는 중 오류가 발생했습니다: ${err.message}</p><pre>${details}</pre>`;
    }
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
        const snap = await getDocs(collection(db, "characters"));
        
        if (snap.empty) {
            list.innerHTML = '';
            return;
        }
        
        const sorted = snap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .sort((a, b) => (b.updatedAt?.seconds ?? 0) - (a.updatedAt?.seconds ?? 0))
            .slice(0, 8);
        
        list.innerHTML = sorted.map(d => {
            let dateStr = '';
            if (d.updatedAt?.seconds) {
                dateStr = new Date(d.updatedAt.seconds * 1000).toLocaleDateString('ko-KR');
            }
            return `
                <div class="recent-item">
                    <a href="detail.html#${d.id}" class="recent-link">${d.name || d.id}</a>
                    <div class="recent-meta">
                        <span>${d.updatedBy || '익명'}</span>
                        ${dateStr ? `<span>${dateStr}</span>` : ''}
                    </div>
                </div>`;
        }).join('');
    } catch (e) {
        console.error("Recent changes error:", e);
    }
    
    setTimeout(renderRecentChanges, 30000);
}

window.onhashchange = () => location.reload();
loadDetail();
