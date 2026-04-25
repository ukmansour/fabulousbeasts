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

onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userInfo = document.getElementById('user-info');
        if (userInfo) userInfo.innerHTML = `<span style="color:white; font-size:0.75rem; margin-right:0.4rem;">${user.displayName || '유저'}님</span><a href="#" class="nav-link" id="logout-btn">로그아웃</a>`;
        
        // 로그아웃 버튼 이벤트 바인딩
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.onclick = (e) => {
                e.preventDefault();
                if (confirm("로그아웃하시겠습니까?")) {
                    import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js").then(m => m.signOut(auth)).then(() => location.href = 'index.html');
                }
            };
        }
        
        await loadInitialData();
    } else {
        alert("편집하려면 로그인이 필요합니다.");
        window.location.href = 'auth.html';
    }
});

async function loadInitialData() {
    if (!charId) { window.location.href = 'index.html'; return; }
    
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
        console.error("데이터 로드 중 오류:", e);
    }
    
    if (!char) char = { id: charId, name: charId, title: "", image: "", category: "기타" };
    
    originalData = char;
    renderEditor();
}

function renderEditor() {
    document.getElementById('edit-title').textContent = `${originalData.name || charId} 편집`;
    cancelLink.href = `detail.html#${charId}`;

    let html = `
        <div class="field-group">
            <label class="field-label">한 줄 소개</label>
            <input type="text" id="field-title" class="field-input" value="${originalData.title || ''}">
        </div>
        <div class="field-group">
            <label class="field-label">대표 이미지 URL</label>
            <input type="text" id="field-image" class="field-input" value="${originalData.image || ''}">
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
                <textarea id="field-${s.id}" class="field-textarea">${originalData[s.id] || ''}</textarea>
            </div>`;
    });
    dynamicSections.innerHTML = html;
}

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
        let p = text.replace(/\[\[([^|\]]+)(?:\|([^\]]+))?\]\]/g, (m, id, label) => `<a href="detail.html#${id.trim()}">${(label || id).trim()}</a>`);
        return typeof marked !== 'undefined' ? marked.parse(p) : p;
    };
    let html = `<h1 class="wiki-title">${originalData.name || charId}</h1><div class="wiki-content">`;
    DETAIL_SECTIONS.forEach(s => {
        const field = document.getElementById(`field-${s.id}`);
        if (field && field.value.trim()) {
            const val = field.value;
            if (s.id === 'gallery') {
                const imgs = val.split('\n').filter(u => u.trim().startsWith('http'));
                html += `<h2>${s.label}</h2><div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(120px,1fr)); gap:0.5rem;">${imgs.map(u => `<img src="${u.trim()}" style="width:100%; border-radius:2px;">`).join('')}</div>`;
            } else { html += `<h2>${s.label}</h2><div>${parseWiki(val)}</div>`; }
        }
    });
    previewContent.innerHTML = html + "</div>";
}

editForm.onsubmit = async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    
    const data = {
        id: charId,
        name: originalData.name || charId,
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
        const field = document.getElementById(`field-${s.id}`);
        if (field) data[s.id] = field.value; 
    });

    try {
        const docRef = doc(db, "characters", charId);
        // 편집 이력은 자동으로 한 줄 추가 (요약 없이)
        const historyEntry = {
            user: data.updatedBy,
            timestamp: new Date(),
            note: "내용 수정"
        };
        
        await setDoc(docRef, { ...data, history: arrayUnion(historyEntry) }, { merge: true });
        alert("저장되었습니다.");
        window.location.href = `detail.html#${charId}`;
    } catch (e) { 
        console.error("저장 중 오류 발생:", e);
        alert("저장 실패: " + e.message); 
    }
};
