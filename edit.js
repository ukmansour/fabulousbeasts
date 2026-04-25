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

let originalData = null;

// 로그인 상태 체크 및 초기 데이터 로딩
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
        await initEditor();
    } else {
        alert("편집하려면 로그인이 필요합니다.");
        window.location.href = 'auth.html';
    }
});

async function initEditor() {
    if (!charId) {
        alert("캐릭터 ID가 없습니다.");
        window.location.href = 'index.html';
        return;
    }

    // 1. 최신 데이터 로드 (Firestore 우선 -> Local 차선)
    let char = null;
    try {
        const docRef = doc(db, "characters", charId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            char = { id: charId, ...docSnap.data() };
        } else {
            const localChar = CHARACTERS.find(c => c.id === charId);
            if (localChar) char = { ...localChar };
        }
    } catch (e) {
        console.error("데이터 로드 실패:", e);
    }

    // 문서가 아예 없는 경우 초기화
    if (!char) {
        char = { id: charId, name: charId, title: "", image: "", category: "기타" };
    }

    originalData = char;
    renderFields();
}

function renderEditorField(label, id, value, type = 'input') {
    const isTextarea = type === 'textarea';
    return `
        <div class="field-group" style="margin-bottom: 1.5rem;">
            <label class="field-label" style="font-weight: 800; display: block; margin-bottom: 0.5rem;">${label}</label>
            ${isTextarea 
                ? `<textarea id="field-${id}" class="field-textarea" style="width:100%; min-height:200px; padding:10px; border:1px solid #ccc; font-family:inherit;">${value || ''}</textarea>`
                : `<input type="text" id="field-${id}" class="field-input" style="width:100%; padding:10px; border:1px solid #ccc;" value="${value || ''}">`
            }
        </div>
    `;
}

function renderFields() {
    document.getElementById('edit-title').textContent = `${originalData.name || charId} 편집`;
    cancelLink.href = `detail.html#${charId}`;

    let html = '';

    // 1. 기본 정보 섹션
    html += `<h2 style="font-size: 1.2rem; margin-bottom: 1rem; border-bottom: 2px solid var(--primary-color); padding-bottom: 5px;">기본 정보</h2>`;
    html += renderEditorField('문서 제목 (캐릭터 이름)', 'name', originalData.name);
    html += renderEditorField('한 줄 소개', 'title', originalData.title);
    html += renderEditorField('이미지 URL', 'image', originalData.image);
    
    html += `<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">`;
    html += renderEditorField('별명', 'nickname', originalData.nickname);
    html += renderEditorField('종족', 'species', originalData.species);
    html += renderEditorField('성별', 'gender', originalData.gender);
    html += renderEditorField('국적', 'nationality', originalData.nationality);
    html += renderEditorField('생일', 'birthday', originalData.birthday);
    html += renderEditorField('키', 'height', originalData.height);
    html += `</div>`;

    // 2. 상세 섹션 (8단계)
    html += `<h2 style="font-size: 1.2rem; margin: 2rem 0 1rem; border-bottom: 2px solid var(--primary-color); padding-bottom: 5px;">상세 내용</h2>`;
    DETAIL_SECTIONS.forEach(s => {
        html += renderEditorField(s.label, s.id, originalData[s.id], 'textarea');
    });

    dynamicSections.innerHTML = html;
}

// 탭 로직
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
    const parseWiki = (text) => {
        if (!text) return '';
        // 위키링크 파싱
        let p = text.replace(/\[\[([^|\]]+)(?:\|([^\]]+))?\]\]/g, (match, id, label) => {
            return `<a href="detail.html#${id.trim()}" style="color:var(--primary-color); text-decoration:none;">${(label || id).trim()}</a>`;
        });
        return typeof marked !== 'undefined' ? marked.parse(p) : p;
    };

    let previewHtml = `<h1 class="wiki-title">${document.getElementById('field-name').value}</h1><div class="wiki-content">`;
    DETAIL_SECTIONS.forEach(s => {
        const val = document.getElementById(`field-${s.id}`).value;
        if (val && val.trim()) {
            previewHtml += `<h2 style="border-bottom:1px solid #ccc; margin-top:20px;">${s.label}</h2>`;
            if (s.id === 'gallery') {
                const imgs = val.split('\n').filter(u => u.trim().startsWith('http'));
                previewHtml += `<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(150px,1fr)); gap:10px; margin-top:10px;">
                    ${imgs.map(u => `<img src="${u.trim()}" style="width:100%; border-radius:4px;">`).join('')}
                </div>`;
            } else {
                previewHtml += `<div>${parseWiki(val)}</div>`;
            }
        }
    });
    previewContent.innerHTML = previewHtml + "</div>";
}

// 저장 버튼 핸들러
editForm.onsubmit = async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return;

    // 데이터 수집
    const updatedData = {
        id: charId,
        name: document.getElementById('field-name').value,
        title: document.getElementById('field-title').value,
        image: document.getElementById('field-image').value,
        nickname: document.getElementById('field-nickname').value,
        species: document.getElementById('field-species').value,
        gender: document.getElementById('field-gender').value,
        nationality: document.getElementById('field-nationality').value,
        birthday: document.getElementById('field-birthday').value,
        height: document.getElementById('field-height').value,
        updatedAt: new Date(),
        updatedBy: user.displayName || user.email.split('@')[0],
        category: originalData.category || "기타"
    };

    DETAIL_SECTIONS.forEach(s => {
        updatedData[s.id] = document.getElementById(`field-${s.id}`).value;
    });

    try {
        const docRef = doc(db, "characters", charId);
        
        // 편집 기록(History) 추가
        const historyEntry = {
            user: updatedData.updatedBy,
            timestamp: new Date(),
            note: "문서 수정"
        };

        await setDoc(docRef, { 
            ...updatedData, 
            history: arrayUnion(historyEntry) 
        }, { merge: true });

        alert("저장되었습니다.");
        window.location.href = `detail.html#${charId}`;
    } catch (error) {
        console.error("저장 중 오류 발생:", error);
        alert("저장 실패: " + error.message);
    }
};
