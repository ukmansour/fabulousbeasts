import { CHARACTERS, DETAIL_SECTIONS } from './data.js';
import { db, auth, storage } from './firebase-config.js';
import { doc, getDoc, setDoc, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

const charId = window.location.hash.replace('#', '');
const dynamicFields = document.getElementById('dynamic-fields');
const editForm = document.getElementById('edit-form');
const cancelLink = document.getElementById('cancel-link');

let userRole = 'member';

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        alert("로그인이 필요합니다.");
        window.location.href = 'auth.html';
        return;
    }

    try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
            userRole = userDoc.data().role || 'member';
        }
    } catch (e) {
        console.error("사용자 권한 확인 중 오류:", e);
    }

    await loadCharacterData();
});

async function loadCharacterData() {
    console.log("로드 중인 캐릭터 ID:", charId);
    
    // 로컬 데이터에서 먼저 찾기
    let char = CHARACTERS.find(c => c.id === charId);
    
    // Firestore에서 최신 데이터 가져오기
    try {
        const docRef = doc(db, "characters", charId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            char = { ...char, ...docSnap.data() };
        }
    } catch (e) {
        console.error("Firestore 데이터 로드 실패:", e);
    }

    if (!char) {
        alert("캐릭터 정보를 불러올 수 없습니다. (ID: " + charId + ")");
        window.location.href = 'index.html';
        return;
    }

    document.getElementById('edit-title').textContent = `${char.name} 편집`;
    cancelLink.href = `detail.html#${charId}`;

    let fieldsHtml = `
        <div class="form-group">
            <label>캐릭터 이름 (변경 불가)</label>
            <input type="text" value="${char.name}" disabled style="background: #f4f4f4; color: #888;">
        </div>
        <div class="form-group">
            <label>한 줄 소개 (title)</label>
            <input type="text" id="field-title" value="${char.title || ''}" placeholder="캐릭터를 설명하는 짧은 문구">
        </div>
        <div class="form-group">
            <label>이미지 설정</label>
            <div style="display: flex; gap: 0.5rem;">
                <input type="text" id="field-image" value="${char.image || ''}" style="flex: 1;" placeholder="이미지 URL">
                <label for="image-upload" class="btn-cancel" style="padding: 0.8rem 1.2rem; cursor: pointer; white-space: nowrap; margin: 0;">파일 선택</label>
                <input type="file" id="image-upload" style="display: none;" accept="image/*">
            </div>
        </div>
        
        <h3 style="margin: 2.5rem 0 1rem; border-bottom: 2px solid var(--primary-color); padding-bottom: 0.5rem; color: var(--primary-color);">기본 프로필</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem;">
            ${[
                { id: 'nickname', label: '별명' },
                { id: 'gender', label: '성별' },
                { id: 'species', label: '종족' },
                { id: 'nationality', label: '국적' },
                { id: 'birthday', label: '생일' },
                { id: 'height', label: '키' }
            ].map(item => `
                <div class="form-group">
                    <label>${item.label}</label>
                    <input type="text" id="field-${item.id}" value="${char[item.id] || ''}">
                </div>
            `).join('')}
        </div>

        <h3 style="margin: 2.5rem 0 1rem; border-bottom: 2px solid var(--primary-color); padding-bottom: 0.5rem; color: var(--primary-color);">상세 설정</h3>
    `;

    DETAIL_SECTIONS.forEach(section => {
        if (section.id === 'yusu_huihwa') return;
        fieldsHtml += `
            <div class="form-group">
                <label>${section.label}</label>
                <textarea id="field-${section.id}" placeholder="${section.label} 내용을 입력하세요...">${char[section.id] || ''}</textarea>
            </div>
        `;
    });

    dynamicFields.innerHTML = fieldsHtml;

    // 파일 업로드 핸들러
    document.getElementById('image-upload').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const btnLabel = document.querySelector('label[for="image-upload"]');
        const originalText = btnLabel.textContent;
        btnLabel.textContent = "업로드 중...";

        try {
            const fileRef = ref(storage, `characters/${charId}/${Date.now()}_${file.name}`);
            const uploadTask = await uploadBytes(fileRef, file);
            const url = await getDownloadURL(uploadTask.ref);
            document.getElementById('field-image').value = url;
            alert("이미지 업로드가 완료되었습니다.");
        } catch (err) {
            console.error(err);
            alert("업로드 실패: " + err.message);
        } finally {
            btnLabel.textContent = originalText;
        }
    });
}

editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // 현재는 누구나 편집 가능하지만, 관리자 전용으로 바꾸고 싶다면 아래 주석을 해제하세요.
    /*
    if (userRole !== 'admin') {
        alert("관리자만 문서를 편집할 수 있는 설정입니다.");
        return;
    }
    */

    const user = auth.currentUser;
    const editorName = user.displayName || user.email.split('@')[0];
    
    const historyEntry = {
        user: editorName,
        timestamp: new Date(),
        type: 'edit',
        note: '문서 수정'
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
        const el = document.getElementById(`field-${section.id}`);
        if (el) updatedData[section.id] = el.value;
    });

    try {
        const docRef = doc(db, "characters", charId);
        
        // 데이터 저장 및 이력 추가
        await setDoc(docRef, { 
            ...updatedData, 
            history: arrayUnion(historyEntry) 
        }, { merge: true });

        // 기여도 업데이트
        try {
            const userRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
                await updateDoc(userRef, {
                    contributionCount: (userSnap.data().contributionCount || 0) + 1
                });
            }
        } catch (e) { console.warn("기여도 업데이트 실패:", e); }

        alert("저장이 완료되었습니다!");
        window.location.href = `detail.html#${charId}`;
    } catch (error) {
        console.error("저장 실패:", error);
        alert("저장 중 오류가 발생했습니다: " + error.message);
    }
});
