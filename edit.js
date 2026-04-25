import { CHARACTERS, DETAIL_SECTIONS } from './data.js';
import { db, auth } from './firebase-config.js';
import { doc, getDoc, setDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const charId = window.location.hash.replace('#', '');
const dynamicSections = document.getElementById('dynamic-sections');
const editForm = document.getElementById('edit-form');
const cancelLink = document.getElementById('cancel-link');
const previewBox = document.getElementById('preview-box');
const editTabs = document.querySelectorAll('.edit-tab');
const editPanels = document.querySelectorAll('.edit-panel');

// 유저 상태 관리
onAuthStateChanged(auth, async (user) => {
    const userInfo = document.getElementById('user-info');
    if (userInfo) {
        if (user) {
            const displayName = user.displayName || user.email.split('@')[0];
            userInfo.innerHTML = `
                <span class="nav-link" style="color: var(--secondary-color); font-weight: 700;">${displayName}님</span>
                <a href="#" class="nav-link" id="logout-btn">로그아웃</a>
            `;
            document.getElementById('logout-btn')?.addEventListener('click', (e) => {
                e.preventDefault();
                if (confirm("로그아웃하시겠습니까?")) {
                    signOut(auth);
                }
            });
        } else {
            userInfo.innerHTML = `<a href="auth.html" class="nav-link" id="login-link">로그인</a>`;
        }
    }

    if (!user) {
        alert("로그인이 필요합니다.");
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
    } catch (e) { console.error(e); }

    if (!char) return;

    document.getElementById('edit-title').textContent = `${char.name} (편집)`;
    document.getElementById('field-title').value = char.title || '';
    cancelLink.href = `detail.html#${charId}`;

    let sectionsHtml = '';
    DETAIL_SECTIONS.forEach(section => {
        if (section.id === 'yusu_huihwa') return;
        sectionsHtml += `
            <div class="form-section-title">${section.label}</div>
            <textarea id="field-${section.id}" class="wiki-editor-textarea" placeholder="${section.label} 내용을 입력하세요 (마크다운 지원)">${char[section.id] || ''}</textarea>
        `;
    });
    dynamicSections.innerHTML = sectionsHtml;
}

// 탭 전환 및 미리보기 기능
editTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const target = tab.getAttribute('data-target');
        
        editTabs.forEach(t => t.classList.remove('active'));
        editPanels.forEach(p => p.classList.remove('active'));
        
        tab.classList.add('active');
        document.getElementById(target).classList.add('active');

        if (target === 'preview-panel') {
            updatePreview();
        }
    });
});

function updatePreview() {
    let previewHtml = '';
    DETAIL_SECTIONS.forEach(section => {
        if (section.id === 'yusu_huihwa') return;
        const content = document.getElementById(`field-${section.id}`).value;
        if (content.trim()) {
            previewHtml += `<h3>${section.label}</h3><div>${marked.parse(content)}</div><hr>`;
        }
    });
    previewBox.innerHTML = previewHtml || '<p style="color:#888;">내용이 없습니다.</p>';
}

editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const user = auth.currentUser;
    const summary = document.getElementById('edit-summary').value.trim() || '내용 수정';
    
    const updatedData = {
        title: document.getElementById('field-title').value,
        updatedAt: new Date(),
        updatedBy: user.displayName || user.email.split('@')[0]
    };

    DETAIL_SECTIONS.forEach(section => {
        if (section.id === 'yusu_huihwa') return;
        updatedData[section.id] = document.getElementById(`field-${section.id}`).value;
    });

    try {
        const docRef = doc(db, "characters", charId);
        const historyEntry = {
            user: updatedData.updatedBy,
            timestamp: new Date(),
            note: summary
        };

        await setDoc(docRef, { 
            ...updatedData, 
            history: arrayUnion(historyEntry) 
        }, { merge: true });

        alert("저장되었습니다.");
        window.location.href = `detail.html#${charId}`;
    } catch (error) {
        alert("오류 발생: " + error.message);
    }
});
