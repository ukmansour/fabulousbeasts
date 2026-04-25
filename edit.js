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

// 권한 확인 및 초기화
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        alert("로그인이 필요합니다.");
        window.location.href = 'auth.html';
        return;
    }

    // 관리자 권한 확인 (Firestore users 컬렉션 조회)
    try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
            userRole = userDoc.data().role || 'member';
        }
    } catch (e) {
        console.warn("Role check error:", e);
    }

    await loadCharacterData();
});

async function loadCharacterData() {
    let char = CHARACTERS.find(c => c.id === charId);
    
    try {
        const docRef = doc(db, "characters", charId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            char = { ...char, ...docSnap.data() };
        }
    } catch (e) {
        console.warn("Firestore fetch error:", e);
    }

    if (!char) {
        alert("캐릭터를 찾을 수 없습니다.");
        window.location.href = 'index.html';
        return;
    }

    document.getElementById('edit-title').textContent = `${char.name} 편집`;
    cancelLink.href = `detail.html#${charId}`;

    // 필드 생성
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
            <label>이미지 설정</label>
            <div style="display: flex; gap: 1rem; align-items: center;">
                <input type="text" id="field-image" value="${char.image || ''}" style="flex: 1;">
                <label for="image-upload" class="btn-cancel" style="padding: 0.8rem; cursor: pointer; margin: 0; font-size: 0.9rem;">파일 업로드</label>
                <input type="file" id="image-upload" style="display: none;" accept="image/*">
            </div>
            <p style="font-size: 0.8rem; color: #888; margin-top: 0.5rem;">URL을 직접 입력하거나 파일을 업로드할 수 있습니다.</p>
        </div>
        
        <h3 style="margin-top: 2rem; border-bottom: 1px solid #ccc; padding-bottom: 0.5rem;">기본 프로필 정보</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            ${['nickname', 'gender', 'species', 'nationality', 'birthday', 'height'].map(key => `
                <div class="form-group">
                    <label>${key === 'nickname' ? '별명' : key === 'gender' ? '성별' : key === 'species' ? '종족' : key === 'nationality' ? '국적' : key === 'birthday' ? '생일' : '키'}</label>
                    <input type="text" id="field-${key}" value="${char[key] || ''}">
                </div>
            `).join('')}
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

    // 이미지 업로드 이벤트 핸들러
    document.getElementById('image-upload').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const uploadLabel = document.querySelector('label[for="image-upload"]');
        const originalText = uploadLabel.textContent;
        uploadLabel.textContent = "업로드 중...";

        try {
            const storageRef = ref(storage, `characters/${charId}/${Date.now()}_${file.name}`);
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);
            
            document.getElementById('field-image').value = downloadURL;
            alert("이미지가 성공적으로 업로드되었습니다.");
        } catch (error) {
            alert("이미지 업로드 실패: " + error.message);
        } finally {
            uploadLabel.textContent = originalText;
        }
    });
}

editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // 관리자 전용 권한 체크 (선택 사항: 원하시면 관리자만 저장 가능하게 활성화)
    /*
    if (userRole !== 'admin') {
        alert("편집 권한이 없습니다. 관리자에게 문의하세요.");
        return;
    }
    */

    const currentUser = auth.currentUser;
    const editorName = currentUser.displayName || currentUser.email.split('@')[0];
    
    const historyEntry = {
        user: editorName,
        timestamp: new Date(),
        type: 'edit',
        note: '문서 내용 수정'
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
        updatedData[section.id] = document.getElementById(`field-${section.id}`).value;
    });

    try {
        const docRef = doc(db, "characters", charId);
        
        // 이력 추가 (arrayUnion 사용)
        await setDoc(docRef, { 
            ...updatedData, 
            history: arrayUnion(historyEntry) 
        }, { merge: true });

        // 기여도 점수 업데이트 (users 컬렉션)
        const userDocRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
            await updateDoc(userDocRef, {
                contributionCount: (userSnap.data().contributionCount || 0) + 1
            });
        }

        alert("성공적으로 저장되었습니다.");
        window.location.href = `detail.html#${charId}`;
    } catch (error) {
        alert("저장 중 오류가 발생했습니다: " + error.message);
    }
});
