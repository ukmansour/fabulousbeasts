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
                isAdmin = userRole === 'admin';
            } else {
                // [가입 즉시 등록 로직]
                const isSupremeAdmin = user.email === "hodu@youshouyan.wiki";
                
                // 이메일 앞부분을 닉네임으로 추출
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
                isAdmin = isSupremeAdmin;
            }
        } catch (e) { 
            console.error("Error fetching user role:", e);
            if (user.email === "hodu@youshouyan.wiki") { userRole = 'admin'; isAdmin = true; }
        }

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
    if (!infoboxArea) return;

    let rows = '';
    const fields = [
        { label: '별명', key: 'alias' },
        { label: '종족', key: 'species' },
        { label: '국적', key: 'nation' },
        { label: '생일', key: 'birthday' },
        { label: '직업', key: 'job' },
        { label: '성향', key: 'personality' }
    ];

    fields.forEach(f => {
        if (data[f.key]) {
            rows += `<tr><th>${f.label}</th><td>${data[f.key]}</td></tr>`;
        }
    });

    const themeColor = data.color || 'var(--primary-color)';

    // [갤러리 미리보기: 모든 사진을 1:1 정사각형 격자로 표시]
    let galleryHtml = '';
    if (data.gallery && data.gallery.length > 0) {
        currentGallery = data.gallery;
        
        galleryHtml = `
            <div class="gallery-row-3" style="flex-wrap: wrap;">
                ${data.gallery.map((img, idx) => `
                    <img src="${img}" class="gallery-thumb-sq" 
                         style="flex: 0 0 calc(33.33% - 4px); margin-bottom: 4px;" 
                         onclick="window.openGallery(${idx})" alt="갤러리 사진 ${idx+1}">
                `).join('')}
            </div>
            <p style="font-size:0.7rem; color:#888; text-align:center; margin-top:8px;">
                🖼️ 사진을 클릭하면 크게 볼 수 있습니다 (총 ${data.gallery.length}장)
            </p>
        `;
    }

    infoboxArea.innerHTML = `
        <table class="infobox">
            <caption class="infobox-title" style="background:${themeColor}">${data.name || charId}</caption>
            <tbody>
                <tr>
                    <td colspan="2" class="infobox-image" style="padding: 10px;">
                        <img src="${data.image || 'https://via.placeholder.com/300x400?text=No+Image'}" alt="대표사진" style="margin-bottom:0; border-radius:6px;">
                        ${galleryHtml}
                    </td>
                </tr>
                ${rows}
            </tbody>
        </table>
    `;
}

let currentIdx = 0;
window.openGallery = (index) => {
    currentIdx = index;
    if (!modalElement) {
        modalElement = document.createElement('div');
        modalElement.className = 'modal-overlay';
        modalElement.innerHTML = `
            <span class="modal-close" onclick="window.closeGallery()">&times;</span>
            <div class="modal-main-view">
                <button class="modal-nav modal-prev" onclick="window.moveSlide(-1)">&lsaquo;</button>
                <img id="modal-img" src="" alt="확대 이미지">
                <button class="modal-nav modal-next" onclick="window.moveSlide(1)">&rsaquo;</button>
            </div>
            <div class="modal-thumbnails" id="modal-thumbs">
                <!-- 썸네일들이 여기에 생성됨 -->
            </div>
        `;
        document.body.appendChild(modalElement);
        
        modalElement.onclick = (e) => { if (e.target === modalElement || e.target.className === 'modal-main-view') window.closeGallery(); };
        
        // [스와이프 기능 추가]
        let touchStartX = 0;
        let touchEndX = 0;

        modalElement.addEventListener('touchstart', e => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        modalElement.addEventListener('touchend', e => {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe();
        }, { passive: true });

        function handleSwipe() {
            const swipeDistance = touchEndX - touchStartX;
            if (swipeDistance > 50) window.moveSlide(-1); // 오른쪽으로 밀면 이전
            else if (swipeDistance < -50) window.moveSlide(1); // 왼쪽으로 밀면 다음
        }

        document.addEventListener('keydown', (e) => {
            if (!modalElement.classList.contains('active')) return;
            if (e.key === 'ArrowLeft') window.moveSlide(-1);
            if (e.key === 'ArrowRight') window.moveSlide(1);
            if (e.key === 'Escape') window.closeGallery();
        });
    }

    renderModalThumbs();
    updateModal();
    modalElement.classList.add('active');
    document.body.style.overflow = 'hidden';
};

function renderModalThumbs() {
    const thumbContainer = document.getElementById('modal-thumbs');
    thumbContainer.innerHTML = currentGallery.map((img, idx) => `
        <img src="${img}" class="modal-thumb ${idx === currentIdx ? 'active' : ''}" 
             onclick="window.goToSlide(${idx})" alt="내비 썸네일 ${idx+1}">
    `).join('');
}

window.goToSlide = (idx) => {
    currentIdx = idx;
    updateModal();
};

window.closeGallery = () => {
    if (modalElement) modalElement.classList.remove('active');
    document.body.style.overflow = 'auto';
};

window.moveSlide = (step) => {
    if (!currentGallery.length) return;
    currentIdx = (currentIdx + step + currentGallery.length) % currentGallery.length;
    updateModal();
};

function updateModal() {
    const img = modalElement.querySelector('#modal-img');
    const thumbs = modalElement.querySelectorAll('.modal-thumb');
    if (!img) return;
    
    img.style.opacity = '0.5';
    img.src = currentGallery[currentIdx];
    img.onload = () => { img.style.opacity = '1'; };
    
    // 썸네일 활성화 상태 변경
    thumbs.forEach((t, idx) => {
        if (idx === currentIdx) {
            t.classList.add('active');
            t.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        } else {
            t.classList.remove('active');
        }
    });
}

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
