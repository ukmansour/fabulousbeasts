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
const MAX_SIZE_MB = 25;

onAuthStateChanged(auth, (user) => {
    currentUser = user;
});

async function loadInitialData() {
    if (!charId) return;
    try {
        const baseData = CHARACTERS.find(c => c.id === charId) || {};
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
    } catch (err) { console.error(err); }
}

dropZone.onclick = () => imageInput.click();

imageInput.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // 1. 용량 체크 (25MB)
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        alert(`파일 용량이 너무 큽니다. ${MAX_SIZE_MB}MB 이하의 파일만 업로드 가능합니다.\n현재 용량: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
        return;
    }

    if (!currentUser) {
        alert("로그인이 필요합니다.");
        return;
    }

    try {
        uploadStatus.style.display = 'block';
        uploadStatus.textContent = '이미지 최적화 및 업로드 중...';
        saveBtn.disabled = true;

        // 2. 이미지 압축 및 리사이징 (Canvas 사용)
        const compressedFile = await compressImage(file);

        const safeFileName = file.name.replace(/[^a-z0-9.]/gi, '_');
        const storageRef = ref(storage, `characters/${charId}/${Date.now()}_${safeFileName}`);
        
        const snapshot = await uploadBytes(storageRef, compressedFile);
        const url = await getDownloadURL(snapshot.ref);

        document.getElementById('image-url').value = url;
        previewImg.src = url;
        previewImg.style.display = 'block';
        uploadMsg.style.display = 'none';
        uploadStatus.textContent = '업로드 완료!';
    } catch (err) {
        console.error(err);
        alert("업로드 실패: " + err.message);
        uploadStatus.textContent = '업로드 실패';
    } finally {
        saveBtn.disabled = false;
    }
};

// 이미지 압축 함수
async function compressImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // 최대 너비 1200px로 제한 (용량 최적화)
                const MAX_WIDTH = 1200;
                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // JPEG 품질 0.8로 압축
                canvas.toBlob((blob) => {
                    resolve(new File([blob], file.name, { type: 'image/jpeg' }));
                }, 'image/jpeg', 0.8);
            };
        };
        reader.onerror = error => reject(error);
    });
}

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
        alert("성공적으로 저장되었습니다.");
        location.href = `detail.html#${charId}`;
    } catch (err) {
        alert("저장 실패: " + err.message);
        saveBtn.disabled = false;
    }
};

loadInitialData();
