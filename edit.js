import { CHARACTERS, DETAIL_SECTIONS } from './data.js';
import { db, auth } from './firebase-config.js';
import { doc, getDoc, setDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

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

onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userInfo = document.getElementById('user-info');
        if (userInfo) userInfo.innerHTML = `<span style="color:white; font-size:0.8rem; margin-right:0.5rem;">${user.displayName || '유저'}님</span><a href="#" class="nav-link" id="logout-btn">로그아웃</a>`;
        try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) userRole = userDoc.data().role || 'member';
        } catch (e) {}
    } else {
        alert("편집하려면 로그인이 필요합니다.");
        window.location.href = 'auth.html';
        return;
    }
    await loadCharacterData();
});

async function loadCharacterData() {
    let char = CHARACTERS.find(c => c.id === charId);
    try {
        const docRef = doc(db, "characters", charId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) char = { ...char, ...docSnap.data() };
    } catch (e) {}

    if (!char) {
        isNewDoc = true;
        char = { id: charId, name: "", title: "", category: "기타", image: "" };
    }

    document.getElementById('edit-title').textContent = isNewDoc ? `새 문서 만들기: ${charId}` : `${char.name} (편집)`;
    document.getElementById('field-title').value = char.title || '';
    cancelLink.href = `detail.html#${charId}`;

    let sectionsHtml = isNewDoc ? `
        <div class="field-group">
            <label class="field-label">캐릭터 이름 (필수)</label>
            <input type="text" id="field-name" class="field-input" placeholder="이름을 입력하세요" required>
        </div>
        <div class="field-group">
            <label class="field-label">대표 이미지 URL</label>
            <input type="text" id="field-image" class="field-input" placeholder="http...">
        </div>
    ` : `
        <input type="hidden" id="field-name" value="${char.name}">
        <div class="field-group">
            <label class="field-label">대표 이미지 URL</label>
            <input type="text" id="field-image" class="field-input" value="${char.image || ''}">
        </div>
    `;

    DETAIL_SECTIONS.forEach(s => {
        sectionsHtml += `
            <div class="field-group">
                <label class="field-label">${s.label}</label>
                <textarea id="field-${s.id}" class="field-textarea" placeholder="${s.label} 내용을 입력하세요...">${char[s.id] || ''}</textarea>
            </div>`;
    });
    dynamicSections.innerHTML = sectionsHtml;
    if (isNewDoc) document.getElementById('field-name').focus();
}

tabEdit.onclick = () => { tabEdit.classList.add('active'); tabPreview.classList.remove('active'); panelEdit.style.display = 'block'; panelPreview.style.display = 'none'; };
tabPreview.onclick = () => { tabEdit.classList.remove('active'); tabPreview.classList.add('active'); panelEdit.style.display = 'none'; panelPreview.style.display = 'block'; updatePreview(); };

function updatePreview() {
    const parseWikiText = (text) => {
        if (!text) return '';
        let parsed = text.replace(/\[\[([^|\]]+)(?:\|([^\]]+))?\]\]/g, (match, id, label) => `<a href="detail.html#${id.trim()}">${(label || id).trim()}</a>`);
        return typeof marked !== 'undefined' ? marked.parse(parsed) : parsed;
    };
    let html = `<h1>${document.getElementById('field-name').value || '(이름 없음)'}</h1><hr>`;
    DETAIL_SECTIONS.forEach(s => {
        const val = document.getElementById(`field-${s.id}`).value;
        if (val.trim()) {
            html += `<h2>${s.label}</h2><div>${s.id === 'gallery' ? '이미지 갤러리' : parseWikiText(val)}</div>`;
        }
    });
    previewContent.innerHTML = html;
}

editForm.onsubmit = async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    const summary = document.getElementById('edit-summary').value.trim() || '문서 생성/수정';
    
    const updatedData = {
        id: charId,
        name: document.getElementById('field-name').value,
        title: document.getElementById('field-title').value,
        image: document.getElementById('field-image').value,
        updatedAt: new Date(),
        updatedBy: user.displayName || user.email.split('@')[0],
        category: "기타" // 기본값
    };

    DETAIL_SECTIONS.forEach(s => { updatedData[s.id] = document.getElementById(`field-${s.id}`).value; });

    try {
        await setDoc(doc(db, "characters", charId), { ...updatedData, history: arrayUnion({ user: updatedData.updatedBy, timestamp: new Date(), note: summary }) }, { merge: true });
        alert("저장되었습니다! 이제 누구나 이 문서를 볼 수 있습니다.");
        window.location.href = `detail.html#${charId}`;
    } catch (error) { alert("저장 실패: " + error.message); }
};
