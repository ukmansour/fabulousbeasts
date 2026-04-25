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
let originalData = null;

onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userInfo = document.getElementById('user-info');
        if (userInfo) userInfo.innerHTML = `<span style="color:white; font-size:0.75rem; margin-right:0.4rem;">${user.displayName || '유저'}님</span><a href="#" class="nav-link" id="logout-btn">로그아웃</a>`;
        try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) userRole = userDoc.data().role || 'member';
        } catch (e) {}
    } else {
        alert("편집하려면 로그인이 필요합니다.");
        window.location.href = 'auth.html';
        return;
    }
    await loadInitialData();
});

async function loadInitialData() {
    let char = CHARACTERS.find(c => c.id === charId);
    try {
        const docRef = doc(db, "characters", charId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            char = { id: charId, ...docSnap.data() };
        }
    } catch (e) { console.error("Firestore error:", e); }

    if (!char) {
        isNewDoc = true;
        char = { id: charId, name: "", title: "", image: "", category: "기타" };
    }
    
    originalData = char;
    renderEditor();
}

function renderEditor() {
    document.getElementById('edit-title').textContent = isNewDoc ? `새 문서 만들기: ${charId}` : `${originalData.name} 편집`;
    document.getElementById('field-title').value = originalData.title || '';
    cancelLink.href = `detail.html#${charId}`;

    let html = `
        <div class="edit-help">
            <strong>💡 위키 문법 안내</strong><br>
            • 굵게: **텍스트** | 기울임: *텍스트* | 리스트: - 항목<br>
            • 링크: [[캐릭터ID]] 또는 [[캐릭터ID|표시할이름]]
        </div>

        <div class="field-group">
            <label class="field-label">캐릭터 이름 ${isNewDoc ? '(필수)' : '(수정 불가)'}</label>
            <input type="text" id="field-name" class="field-input" value="${originalData.name || ''}" ${isNewDoc ? '' : 'disabled'} placeholder="캐릭터 이름을 입력하세요">
        </div>
        
        <div class="field-group">
            <label class="field-label">대표 이미지 URL</label>
            <input type="text" id="field-image" class="field-input" value="${originalData.image || ''}" placeholder="http://...">
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            ${['nickname', 'species', 'gender', 'nationality', 'birthday', 'height'].map(k => `
                <div class="field-group">
                    <label class="field-label">${k.toUpperCase()}</label>
                    <input type="text" id="field-${k}" class="field-input" value="${originalData[k] || ''}">
                </div>
            `).join('')}
        </div>
    `;

    DETAIL_SECTIONS.forEach(s => {
        html += `
            <div class="field-group">
                <label class="field-label">${s.label}</label>
                <textarea id="field-${s.id}" class="field-textarea" placeholder="${s.label} 내용을 입력하세요...">${originalData[s.id] || ''}</textarea>
                ${s.id === 'gallery' && userRole === 'admin' ? `<div class="admin-action-bar"><button type="button" id="add-img-btn" class="btn-primary" style="padding:0.4rem 1rem; font-size:0.8rem;">➕ 이미지 추가</button></div>` : ''}
            </div>`;
    });

    dynamicSections.innerHTML = html;

    if (document.getElementById('add-img-btn')) {
        document.getElementById('add-img-btn').onclick = () => {
            const url = prompt("이미지 주소를 입력하세요:");
            if (url && url.startsWith('http')) {
                const area = document.getElementById('field-gallery');
                area.value = (area.value.trim() + "\n" + url).trim();
            }
        };
    }
}

tabEdit.onclick = () => { tabEdit.classList.add('active'); tabPreview.classList.remove('active'); panelEdit.style.display = 'block'; panelPreview.style.display = 'none'; };
tabPreview.onclick = () => { tabEdit.classList.remove('active'); tabPreview.classList.add('active'); panelEdit.style.display = 'none'; panelPreview.style.display = 'block'; updatePreview(); };

function updatePreview() {
    const parseWiki = (text) => {
        if (!text) return '';
        let p = text.replace(/\[\[([^|\]]+)(?:\|([^\]]+))?\]\]/g, (m, id, label) => `<a href="detail.html#${id.trim()}">${(label || id).trim()}</a>`);
        return typeof marked !== 'undefined' ? marked.parse(p) : p;
    };

    let html = `<h1 class="wiki-title">${document.getElementById('field-name').value || charId}</h1><div class="wiki-content">`;
    DETAIL_SECTIONS.forEach(s => {
        const val = document.getElementById(`field-${s.id}`).value;
        if (val.trim()) {
            if (s.id === 'gallery') {
                const imgs = val.split('\n').filter(u => u.trim().startsWith('http'));
                html += `<h2>${s.label}</h2><div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(120px,1fr)); gap:0.5rem;">${imgs.map(u => `<img src="${u.trim()}" style="width:100%; border-radius:2px;">`).join('')}</div>`;
            } else {
                html += `<h2>${s.label}</h2><div>${parseWiki(val)}</div>`;
            }
        }
    });
    previewContent.innerHTML = html + "</div>";
}

editForm.onsubmit = async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    const summary = document.getElementById('edit-summary').value.trim();
    if (!summary) { alert("편집 요약을 작성해 주세요."); return; }

    const data = {
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

    DETAIL_SECTIONS.forEach(s => { data[s.id] = document.getElementById(`field-${s.id}`).value; });

    try {
        await setDoc(doc(db, "characters", charId), { ...data, history: arrayUnion({ user: data.updatedBy, timestamp: new Date(), note: summary }) }, { merge: true });
        alert("저장되었습니다.");
        window.location.href = `detail.html#${charId}`;
    } catch (e) { alert("오류: " + e.message); }
};
