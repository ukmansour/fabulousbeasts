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

    // 필드 생성 (기본 정보)
    let fieldsHtml = `
        <div class="form-group">
            <label>캐릭터 이름 (변경 불가)</label>
            <input type="text" value="${char.name}" disabled style="background: #f0f0f0;">
        </div>
        <div class="form-group">
            <label>한 줄 소개 (title)</label>
            <input type="text" id="field-title" value="${char.title || ''}">
        </div>
        <div class="form-group">
            <label>이미지 URL</label>
            <input type="text" id="field-image" value="${char.image || ''}">
        </div>
        
        <h3 style="margin-top: 2rem; border-bottom: 1px solid #ccc; padding-bottom: 0.5rem;">기본 프로필 정보</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div class="form-group">
                <label>별명</label>
                <input type="text" id="field-nickname" value="${char.nickname || ''}">
            </div>
            <div class="form-group">
                <label>성별</label>
                <input type="text" id="field-gender" value="${char.gender || ''}">
            </div>
            <div class="form-group">
                <label>종족</label>
                <input type="text" id="field-species" value="${char.species || ''}">
            </div>
            <div class="form-group">
                <label>국적</label>
                <input type="text" id="field-nationality" value="${char.nationality || ''}">
            </div>
            <div class="form-group">
                <label>생일</label>
                <input type="text" id="field-birthday" value="${char.birthday || ''}">
            </div>
            <div class="form-group">
                <label>키</label>
                <input type="text" id="field-height" value="${char.height || ''}">
            </div>
        </div>

        <h3 style="margin-top: 2rem; border-bottom: 1px solid #ccc; padding-bottom: 0.5rem;">상세 설정 내용</h3>
    `;

    DETAIL_SECTIONS.forEach(section => {
        if (section.id === 'yusu_huihwa') return; 
        
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
    
    const currentUser = auth.currentUser;
    const editorName = currentUser.displayName || currentUser.email.split('@')[0];
    
    const historyEntry = {
        user: editorName,
        timestamp: new Date(),
        type: 'edit'
    };

    const updatedData = {
        title: document.getElementById('field-title').value,
        image: document.getElementById('field-image').value,
        nickname: document.getElementById('field-nickname').value,
        gender: document.getElementById('field-gender').value,
        species: document.getElementById('field-species').value,
        nationality: document.getElementById('field-nationality').value,
        birthday: document.getElementById('field-birthday').value,
        height: document.getElementById('field-height').value,
        updatedAt: new Date(),
        updatedBy: editorName
    };

    DETAIL_SECTIONS.forEach(section => {
        if (section.id === 'yusu_huihwa') return;
        const value = document.getElementById(`field-${section.id}`).value;
        updatedData[section.id] = value;
    });

    try {
        const docRef = doc(db, "characters", charId);
        const docSnap = await getDoc(docRef);
        let history = [];
        if (docSnap.exists() && docSnap.data().history) {
            history = docSnap.data().history;
        }
        history.unshift(historyEntry); // 최신 순으로 정렬되도록 앞에 추가
        if (history.length > 10) history = history.slice(0, 10); // 최대 10개까지만 보관
        
        updatedData.history = history;

        await setDoc(docRef, updatedData, { merge: true });
        alert("성공적으로 저장되었습니다.");
        window.location.href = `detail.html#${charId}`;
    } catch (error) {
        alert("저장 중 오류가 발생했습니다: " + error.message);
    }
});
