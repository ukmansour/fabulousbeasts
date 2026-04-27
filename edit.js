import { db, auth, storage } from './firebase-config.js';
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { CHARACTERS } from './data.js';

const charId = location.hash.substring(1);
const form = document.getElementById('edit-form');
const saveBtn = document.getElementById('save-btn');
const dropZone = document.getElementById('drop-zone');
const imageInput = document.getElementById('image-input');
const previewImg = document.getElementById('preview-img');
const uploadStatus = document.getElementById('upload-status');
const uploadMsg = document.getElementById('upload-msg');

let currentUser = null;

onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (!user) {
        alert("편집을 위해 로그인이 필요합니다. (닉네임 설정)");
        location.href = 'auth.html';
    }
});

async function loadInitialData() {
    if (!charId) return;

    // 1. 기본 데이터 가져오기 (data.js)
    const baseData = CHARACTERS.find(c => c.id === charId) || {};
    
    // 2. Firestore 데이터 가져오기
    const docRef = doc(db, "characters", charId);
    const snap = await getDoc(docRef);
    const dbData = snap.exists() ? snap.data() : {};

    const data = { ...baseData, ...dbData };

    document.getElementById('edit-page-title').textContent = `${data.name || charId} 문서 편집`;
    document.getElementById('edit-name').value = data.name || charId;
    document.getElementById('edit-content').value = data.details || '';
    document.getElementById('info-species').value = data.species || '';
    document.getElementById('info-nation').value = data.nation || '';
    document.getElementById('info-alias').value = data.alias || '';
    document.getElementById('info-birthday').value = data.birthday || '';
    document.getElementById('image-url').value = data.image || '';

    if (data.image) {
        previewImg.src = data.image;
        previewImg.style.display = 'block';
        uploadMsg.style.display = 'none';
    }
}

// 이미지 업로드 핸들러
dropZone.onclick = () => imageInput.click();

imageInput.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!currentUser) {
        alert("로그인이 필요합니다.");
        return;
    }

    try {
        uploadStatus.style.display = 'block';
        uploadStatus.textContent = '이미지 업로드 중...';
        saveBtn.disabled = true;

        const storageRef = ref(storage, `characters/${charId}/${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        const url = await getDownloadURL(snapshot.ref);

        document.getElementById('image-url').value = url;
        previewImg.src = url;
        previewImg.style.display = 'block';
        uploadMsg.style.display = 'none';
        uploadStatus.textContent = '업로드 완료!';
    } catch (err) {
        console.error(err);
        alert("이미지 업로드 실패: " + err.message);
        uploadStatus.textContent = '업로드 실패';
    } finally {
        saveBtn.disabled = false;
    }
};

form.onsubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    saveBtn.disabled = true;
    saveBtn.textContent = '저장 중...';

    const updatedData = {
        name: document.getElementById('edit-name').value,
        details: document.getElementById('edit-content').value,
        species: document.getElementById('info-species').value,
        nation: document.getElementById('info-nation').value,
        alias: document.getElementById('info-alias').value,
        birthday: document.getElementById('info-birthday').value,
        image: document.getElementById('image-url').value,
        updatedAt: serverTimestamp(),
        updatedBy: currentUser.displayName || '익명'
    };

    try {
        await setDoc(doc(db, "characters", charId), updatedData, { merge: true });
        alert("문서가 성공적으로 저장되었습니다.");
        location.href = `detail.html#${charId}`;
    } catch (err) {
        console.error(err);
        alert("저장 실패: " + err.message);
        saveBtn.disabled = false;
        saveBtn.textContent = '저장하기';
    }
};

loadInitialData();
