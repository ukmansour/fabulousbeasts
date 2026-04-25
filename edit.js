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

// 유저 상태 및 권한 관리
onAuthStateChanged(auth, async (user) => {
    const userInfo = document.getElementById('user-info');
    if (userInfo) {
        if (user) {
            userInfo.innerHTML = `<span style="color:white; font-size:0.8rem; margin-right:0.5rem;">${user.displayName || '유저'}님</span>
                                  <a href="#" class="nav-link" id="logout-btn">로그아웃</a>`;
            document.getElementById('logout-btn').onclick = (e) => {
                e.preventDefault();
                if (confirm("로그아웃하시겠습니까?")) signOut(auth).then(() => location.reload());
            };
            
            // 관리자 확인
            try {
                const userDoc = await getDoc(doc(db, "users", user.uid));
                if (userDoc.exists()) userRole = userDoc.data().role || 'member';
            } catch (e) { console.error(e); }
        } else {
            userInfo.innerHTML = `<a href="auth.html" class="nav-link">로그인</a>`;
            alert("편집을 하려면 로그인이 필요합니다.");
            window.location.href = 'auth.html';
            return;
        }
    }
    await loadCharacterData();
});

async function loadCharacterData() {
    let char = CHARACTERS.find(c => c.id === charId);
    try {
        const docRef = doc(db, "characters", charId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) char = { ...char, ...docSnap.data() };
    } catch (e) { console.error(e); }

    if (!char) char = { id: charId, name: charId, title: "새로운 문서" };

    document.getElementById('edit-title').textContent = `${char.name} (편집)`;
    document.getElementById('field-title').value = char.title || '';
    cancelLink.href = `detail.html#${charId}`;

    let sectionsHtml = '';
    DETAIL_SECTIONS.forEach(s => {
        sectionsHtml += `
            <div class="field-group">
                <label class="field-label">${s.label}</label>
                <textarea id="field-${s.id}" class="field-textarea" placeholder="${s.label} 내용을 입력하세요...">${char[s.id] || ''}</textarea>
                ${s.id === 'gallery' && userRole === 'admin' ? `
                    <div class="admin-action-bar">
                        <button type="button" id="add-img-btn" class="btn-primary" style="padding:0.4rem 1rem; font-size:0.8rem;">➕ 이미지 링크 추가 (관리자)</button>
                    </div>
                ` : ''}
            </div>
        `;
    });
    dynamicSections.innerHTML = sectionsHtml;

    // 이미지 추가 버튼 로직
    const addImgBtn = document.getElementById('add-img-btn');
    if (addImgBtn) {
        addImgBtn.onclick = () => {
            const url = prompt("이미지 주소(URL)를 입력하세요:");
            if (url && url.startsWith('http')) {
                const galleryArea = document.getElementById('field-gallery');
                galleryArea.value = (galleryArea.value.trim() + "\n" + url).trim();
            }
        };
    }
}

// 탭 전환 및 미리보기
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

    let html = '';
    DETAIL_SECTIONS.forEach(s => {
        const val = document.getElementById(`field-${s.id}`).value;
        if (val.trim()) {
            if (s.id === 'gallery') {
                const imgs = val.split('\n').filter(u => u.trim().startsWith('http'));
                html += `<h2>${s.label}</h2><div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(150px,1fr)); gap:1rem;">
                    ${imgs.map(img => `<img src="${img.trim()}" style="width:100%; border-radius:4px;">`).join('')}
                </div>`;
            } else {
                html += `<h2>${s.label}</h2><div>${parseWikiText(val)}</div>`;
            }
        }
    });
    previewContent.innerHTML = html || '<p style="color:#999;">미리볼 내용이 없습니다.</p>';
}

editForm.onsubmit = async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    const summary = document.getElementById('edit-summary').value.trim() || '내용 수정';
    
    const updatedData = {
        title: document.getElementById('field-title').value,
        updatedAt: new Date(),
        updatedBy: user.displayName || user.email.split('@')[0]
    };

    DETAIL_SECTIONS.forEach(s => {
        updatedData[s.id] = document.getElementById(`field-${s.id}`).value;
    });

    try {
        const docRef = doc(db, "characters", charId);
        const historyEntry = { user: updatedData.updatedBy, timestamp: new Date(), note: summary };
        await setDoc(docRef, { ...updatedData, history: arrayUnion(historyEntry) }, { merge: true });
        alert("성공적으로 저장되었습니다.");
        window.location.href = `detail.html#${charId}`;
    } catch (error) { alert("오류 발생: " + error.message); }
};
