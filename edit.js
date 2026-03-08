import { CHARACTERS, DETAIL_SECTIONS } from './data.js';
import { db, auth } from './firebase-config.js';
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const charId = window.location.hash.replace('#', '');
const dynamicFields = document.getElementById('dynamic-fields');
const editForm = document.getElementById('edit-form');
const cancelLink = document.getElementById('cancel-link');

// 권한 확인 및 초기화
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        alert("로그인이 필요합니다.");
        window.location.href = 'auth.html';
        return;
    }
    await loadCharacterData();
});

async function loadCharacterData() {
    let char = CHARACTERS.find(c => c.id === charId);
    
    // Firestore에서 데이터 가져오기 시도
    try {
        const docRef = doc(db, "characters", charId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            char = { ...char, ...docSnap.data() };
        }
    } catch (e) {
        console.warn("Firestore error:", e);
    }

    if (!char) {
        alert("캐릭터를 찾을 수 없습니다.");
        window.location.href = 'index.html';
        return;
    }

    document.getElementById('edit-title').textContent = `${char.name} 편집`;
    cancelLink.href = `detail.html#${charId}`;

    // 필드 생성 (설정, 외형, 성격, 능력 등)
    let fieldsHtml = `
        <div class="form-group">
            <label>한 줄 소개 (title)</label>
            <input type="text" id="field-title" value="${char.title || ''}">
        </div>
    `;

    DETAIL_SECTIONS.forEach(section => {
        if (section.id === 'yusu_huihwa') return; // 갤러리는 제외 (일단)
        
        fieldsHtml += `
            <div class="form-group">
                <label>${section.label}</label>
                <textarea id="field-${section.id}">${char[section.id] || ''}</textarea>
            </div>
        `;
    });

    dynamicFields.innerHTML = fieldsHtml;
}

editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const updatedData = {
        title: document.getElementById('field-title').value,
        updatedAt: new Date(),
        updatedBy: auth.currentUser.email
    };

    DETAIL_SECTIONS.forEach(section => {
        if (section.id === 'yusu_huihwa') return;
        const value = document.getElementById(`field-${section.id}`).value;
        updatedData[section.id] = value;
    });

    try {
        await setDoc(doc(db, "characters", charId), updatedData, { merge: true });
        alert("성공적으로 저장되었습니다.");
        window.location.href = `detail.html#${charId}`;
    } catch (error) {
        alert("저장 중 오류가 발생했습니다: " + error.message);
    }
});
