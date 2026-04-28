import { db, auth, storage } from './firebase-config.js';
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { ref, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
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

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        alert(`파일 용량이 너무 큽니다. ${MAX_SIZE_MB}MB 이하만 가능합니다.`);
        return;
    }

    if (!charId) {
        alert("캐릭터 ID가 유효하지 않습니다.");
        return;
    }

    if (!currentUser) {
        alert("로그인이 필요합니다.");
        location.href = 'auth.html';
        return;
    }

    try {
        uploadStatus.style.display = 'block';
        uploadStatus.textContent = '이미지 준비 중...';
        uploadStatus.style.color = 'var(--primary-color)';
        saveBtn.disabled = true;

        console.log("Starting compression for file:", file.name, file.size);
        const compressedFile = await compressImage(file);
        console.log("Compression finished:", compressedFile.size);
        
        const safeFileName = file.name.replace(/[^a-z0-9.]/gi, '_');
        const storageRef = ref(storage, `characters/${charId}/${Date.now()}_${safeFileName}`);
        
        uploadStatus.textContent = '업로드 시작 중...';
        const uploadTask = uploadBytesResumable(storageRef, compressedFile);

        uploadTask.on('state_changed', 
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                uploadStatus.textContent = `업로드 중... (${Math.round(progress)}%)`;
                console.log(`Upload progress: ${progress}%`);
            }, 
            (error) => {
                console.error("Upload failed:", error);
                let msg = "업로드 실패: " + error.message;
                if (error.code === 'storage/unauthorized') {
                    msg += "\n권한이 없습니다. 다시 로그인해 보거나 관리자에게 문의하세요.";
                }
                alert(msg);
                uploadStatus.textContent = '업로드 실패';
                uploadStatus.style.color = 'red';
                saveBtn.disabled = false;
            }, 
            async () => {
                const url = await getDownloadURL(uploadTask.snapshot.ref);
                document.getElementById('image-url').value = url;
                previewImg.src = url;
                previewImg.style.display = 'block';
                uploadMsg.style.display = 'none';
                uploadStatus.textContent = '업로드 완료! 아래 저장 버튼을 눌러주세요.';
                uploadStatus.style.color = 'green';
                saveBtn.disabled = false;
            }
        );

    } catch (err) {
        console.error("Compression/Upload error:", err);
        alert("에러 발생: " + err.message);
        uploadStatus.textContent = '처리 중 오류 발생';
        saveBtn.disabled = false;
    }
};

async function compressImage(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = URL.createObjectURL(file);
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            const MAX_WIDTH = 1200;
            const MAX_HEIGHT = 1200;

            if (width > height) {
                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }
            } else {
                if (height > MAX_HEIGHT) {
                    width *= MAX_HEIGHT / height;
                    height = MAX_HEIGHT;
                }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            canvas.toBlob((blob) => {
                URL.revokeObjectURL(img.src);
                if (blob) {
                    resolve(new File([blob], file.name, { type: 'image/jpeg' }));
                } else {
                    reject(new Error("Canvas blob creation failed"));
                }
            }, 'image/jpeg', 0.8);
        };
        img.onerror = (err) => {
            URL.revokeObjectURL(img.src);
            reject(err);
        };
    });
}

form.onsubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    saveBtn.disabled = true;
    saveBtn.textContent = '문서 저장 중...';

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
        alert("문서가 성공적으로 저장되었습니다!");
        location.href = `detail.html#${charId}`;
    } catch (err) {
        alert("저장 실패: " + err.message);
        saveBtn.disabled = false;
        saveBtn.textContent = '저장하기';
    }
};

loadInitialData();
