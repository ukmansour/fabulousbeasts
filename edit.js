import { CHARACTERS, DETAIL_SECTIONS } from './data.js';
import { db, auth } from './firebase-config.js';
import { doc, getDoc, setDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const charId = window.location.hash.replace('#', '');
const dynamicSections = document.getElementById('dynamic-sections');
const editForm = document.getElementById('edit-form');
const cancelLink = document.getElementById('cancel-link');
const previewContent = document.getElementById('preview-content');
const tabEdit = document.getElementById('tab-edit');
const tabPreview = document.getElementById('tab-preview');
const panelEdit = document.getElementById('panel-edit');
const panelPreview = document.getElementById('panel-preview');

let userRole = 'member';
let isNewDoc = false;
let currentCharData = null;

// 초기화: 로그인 상태 확인 후 데이터 로드
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userInfo = document.getElementById('user-info');
        if (userInfo) {
            userInfo.innerHTML = `
                <span style="color:white; font-size:0.8rem; margin-right:0.5rem;">${user.displayName || '유저'}님</span>
                <a href="#" class="nav-link" id="logout-btn">로그아웃</a>
            `;
            document.getElementById('logout-btn').onclick = (e) => {
                e.preventDefault();
                if (confirm("로그아웃하시겠습니까?")) {
                    import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js").then(m => m.signOut(auth)).then(() => location.reload());
                }
            };
        }
        
        try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) userRole = userDoc.data().role || 'member';
        } catch (e) { console.error("권한 로드 실패:", e); }
        
        await loadCharacterData();
    } else {
        alert("문서를 편집하려면 로그인이 필요합니다.");
        window.location.href = 'auth.html';
    }
});

async function loadCharacterData() {
    if (!charId) {
        alert("잘못된 접근입니다.");
        window.location.href = 'index.html';
        return;
    }

    // 1. 기본 데이터 (Local) 가져오기
    let char = CHARACTERS.find(c => c.id === charId);
    
    // 2. Firestore 데이터 (Remote) 가져오기 및 병합
    try {
        const docRef = doc(db, "characters", charId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            // 원격 데이터가 있으면 로컬 데이터를 덮어씌움 (최신 원문 보장)
            const remoteData = docSnap.data();
            char = char ? { ...char, ...remoteData } : { id: charId, ...remoteData };
        }
    } catch (e) {
        console.error("Firestore 데이터 로드 실패:", e);
    }

    if (!char) {
        isNewDoc = true;
        char = {
            id: charId,
            name: "",
            title: "",
            image: "",
            category: "기타"
        };
    }
    
    currentCharData = char; // 현재 로드된 원문 저장

    // UI 업데이트
    document.getElementById('edit-title').textContent = isNewDoc ? `새 문서 만들기: ${charId}` : `${char.name} 편집`;
    document.getElementById('field-title').value = char.title || '';
    cancelLink.href = `detail.html#${charId}`;

    let sectionsHtml = '';
    
    // 이름 및 이미지 필드 (새 문서일 때만 이름 입력 가능하게)
    sectionsHtml += `
        <div class="field-group">
            <label class="field-label">캐릭터 이름 ${isNewDoc ? '(필수)' : '(수정 불가)'}</label>
            <input type="text" id="field-name" class="field-input" value="${char.name || ''}" ${isNewDoc ? '' : 'disabled'} placeholder="캐릭터 이름을 입력하세요">
        </div>
        <div class="field-group">
            <label class="field-label">대표 이미지 URL</label>
            <input type="text" id="field-image" class="field-input" value="${char.image || ''}" placeholder="http://...">
        </div>
    `;

    // 8단계 섹션 원문 채우기
    DETAIL_SECTIONS.forEach(s => {
        let content = char[s.id] || '';
        // 갤러리 섹션의 경우 가독성을 위해 앞뒤 공백 정리
        if (s.id === 'gallery') content = content.trim();

        sectionsHtml += `
            <div class="field-group">
                <label class="field-label">${s.label}</label>
                <textarea id="field-${s.id}" class="field-textarea" placeholder="${s.label} 내용을 입력하세요... (마크다운 지원)">${content}</textarea>
                ${s.id === 'gallery' && userRole === 'admin' ? `
                    <div class="admin-action-bar">
                        <button type="button" id="add-img-btn" class="btn-primary" style="padding:0.4rem 1rem; font-size:0.8rem;">➕ 이미지 링크 추가 (관리자)</button>
                    </div>
                ` : ''}
            </div>
        `;
    });

    dynamicSections.innerHTML = sectionsHtml;

    // 관리자 이미지 추가 기능 바인딩
    if (document.getElementById('add-img-btn')) {
        document.getElementById('add-img-btn').onclick = () => {
            const url = prompt("이미지 주소(URL)를 입력하세요:");
            if (url && url.startsWith('http')) {
                const galleryArea = document.getElementById('field-gallery');
                galleryArea.value = (galleryArea.value.trim() + "\n" + url.trim()).trim();
            }
        };
    }
}

// 탭 전환 시스템
tabEdit.onclick = () => {
    tabEdit.classList.add('active'); tabPreview.classList.remove('active');
    panelEdit.style.display = 'block'; panelPreview.style.display = 'none';
};

tabPreview.onclick = () => {
    tabEdit.classList.remove('active'); tabPreview.classList.add('active');
    panelEdit.style.display = 'none'; panelPreview.style.display = 'block';
    updatePreview();
};

function updatePreview() {
    const parseWikiText = (text) => {
        if (!text) return '';
        let parsed = text.replace(/\[\[([^|\]]+)(?:\|([^\]]+))?\]\]/g, (match, id, label) => {
            return `<a href="detail.html#${id.trim()}">${(label || id).trim()}</a>`;
        });
        return typeof marked !== 'undefined' ? marked.parse(parsed) : parsed;
    };

    let html = `<h1>${document.getElementById('field-name').value || '(이름 없음)'}</h1><hr>`;
    DETAIL_SECTIONS.forEach(s => {
        const val = document.getElementById(`field-${s.id}`).value;
        if (val.trim()) {
            if (s.id === 'gallery') {
                const imgs = val.split('\n').filter(u => u.trim().startsWith('http'));
                html += `<h2>${s.label}</h2><div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(150px,1fr)); gap:1rem; margin-top:1rem;">
                    ${imgs.map(img => `<img src="${img.trim()}" style="width:100%; border-radius:4px; border:1px solid #eee;">`).join('')}
                </div>`;
            } else {
                html += `<h2>${s.label}</h2><div class="wiki-content">${parseWikiText(val)}</div>`;
            }
        }
    });
    previewContent.innerHTML = html;
}

// 저장 로직: Firestore에 원격 저장
editForm.onsubmit = async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    const summary = document.getElementById('edit-summary').value.trim() || '내용 수정';
    
    const updatedData = {
        id: charId,
        name: document.getElementById('field-name').value,
        title: document.getElementById('field-title').value,
        image: document.getElementById('field-image').value,
        updatedAt: new Date(),
        updatedBy: user.displayName || user.email.split('@')[0],
        category: currentCharData ? currentCharData.category : "기타"
    };

    // 8단계 섹션 데이터 수집
    DETAIL_SECTIONS.forEach(s => {
        updatedData[s.id] = document.getElementById(`field-${s.id}`).value;
    });

    try {
        const docRef = doc(db, "characters", charId);
        const historyEntry = {
            user: updatedData.updatedBy,
            timestamp: new Date(),
            note: summary
        };

        // 데이터 저장 및 이력(History) 업데이트
        await setDoc(docRef, { 
            ...updatedData, 
            history: arrayUnion(historyEntry) 
        }, { merge: true });

        alert("성공적으로 저장되었습니다! 모든 사용자가 변경 사항을 볼 수 있습니다.");
        window.location.href = `detail.html#${charId}`;
    } catch (error) {
        console.error("저장 오류:", error);
        alert("저장 중 오류가 발생했습니다: " + error.message);
    }
};
