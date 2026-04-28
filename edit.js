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
const editor = document.getElementById('edit-content');

let currentUser = null;
let userRole = 'member';
let isProtected = false;
const MAX_SIZE_MB = 25;

onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    if (user) {
        try {
            const userSnap = await getDoc(doc(db, "users", user.uid));
            if (userSnap.exists()) {
                userRole = userSnap.data().role || 'member';
            }
        } catch (e) { console.error("Error fetching user role:", e); }
    }
});

function initToolbar() {
    if (!editor) return;
    document.querySelectorAll('.toolbar-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault();
            const type = btn.dataset.type;
            const start = editor.selectionStart;
            const end = editor.selectionEnd;
            const text = editor.value;
            const selectedText = text.substring(start, end);
            let replacement = '';

            switch (type) {
                case 'h2': replacement = `\n## ${selectedText || '제목'}\n`; break;
                case 'h3': replacement = `\n### ${selectedText || '소제목'}\n`; break;
                case 'bold': replacement = `**${selectedText || '굵은글씨'}**`; break;
                case 'italic': replacement = `*${selectedText || '기울임'}*`; break;
                case 'link': replacement = `[${selectedText || '링크이름'}](주소)`; break;
                case 'image': replacement = `![${selectedText || '설명'}](이미지주소)`; break;
                case 'list': replacement = `\n* ${selectedText || '항목'}`; break;
                case 'hr': replacement = `\n---\n`; break;
            }

            // 텍스트 삽입 및 포커스 유지
            editor.focus();
            const before = text.substring(0, start);
            const after = text.substring(end);
            editor.value = before + replacement + after;
            
            // 커서 위치 조정
            const newCursorPos = start + replacement.length;
            editor.setSelectionRange(newCursorPos, newCursorPos);
        };
    });
}

async function loadInitialData() {
    if (!charId) return;
    try {
        const baseData = CHARACTERS.find(c => c.id === charId) || {};
        const docRef = doc(db, "characters", charId);
        const snap = await getDoc(docRef);
        const dbData = snap.exists() ? snap.data() : {};
        const data = { ...baseData, ...dbData };

        isProtected = data.isProtected || false;
        if (isProtected) {
            uploadMsg.textContent = "🔒 이 문서는 보호되어 있습니다 (관리자 전용)";
            uploadMsg.style.display = 'block';
            uploadMsg.style.color = "red";
        }

        document.getElementById('edit-page-title').textContent = `${data.name || charId} 문서 편집`;
        document.getElementById('edit-name').value = data.name || charId;
        editor.value = data.details || '';
        document.getElementById('info-species').value = data.species || '';
        document.getElementById('info-nation').value = data.nation || '';
        document.getElementById('info-alias').value = data.alias || '';
        document.getElementById('info-birthday').value = data.birthday || '';
        document.getElementById('image-url').value = data.image || '';

        if (data.image) {
            previewImg.src = data.image;
            previewImg.style.display = 'block';
            if (!isProtected) uploadMsg.style.display = 'none';
        }
    } catch (err) { console.error(err); }
}

dropZone.onclick = () => {
    if (isProtected && userRole !== 'admin') {
        alert("이 문서는 보호되어 있어 이미지를 변경할 수 없습니다.");
        return;
    }
    imageInput.click();
};

imageInput.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        alert(`파일 용량이 너무 큽니다. ${MAX_SIZE_MB}MB 이하만 가능합니다.`);
        return;
    }
    if (!charId) { alert("캐릭터 ID가 유효하지 않습니다."); return; }
    if (!currentUser) { alert("로그인이 필요합니다."); location.href = 'auth.html'; return; }

    try {
        uploadStatus.style.display = 'block';
        uploadStatus.textContent = '이미지 준비 중...';
        saveBtn.disabled = true;

        const compressedFile = await compressImage(file);
        const safeFileName = file.name.replace(/[^a-z0-9.]/gi, '_');
        const storageRef = ref(storage, `characters/${charId}/${Date.now()}_${safeFileName}`);
        const uploadTask = uploadBytesResumable(storageRef, compressedFile);

        uploadTask.on('state_changed', 
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                uploadStatus.textContent = `업로드 중... (${Math.round(progress)}%)`;
            }, 
            (error) => {
                alert("업로드 실패: " + error.message);
                uploadStatus.textContent = '업로드 실패';
                saveBtn.disabled = false;
            }, 
            async () => {
                const url = await getDownloadURL(uploadTask.snapshot.ref);
                document.getElementById('image-url').value = url;
                previewImg.src = url;
                previewImg.style.display = 'block';
                uploadStatus.textContent = '업로드 완료!';
                saveBtn.disabled = false;
            }
        );
    } catch (err) {
        alert("에러 발생: " + err.message);
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
            const MAX = 1200;
            if (width > height) { if (width > MAX) { height *= MAX/width; width = MAX; } }
            else { if (height > MAX) { width *= MAX/height; height = MAX; } }
            canvas.width = width; canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob((blob) => {
                URL.revokeObjectURL(img.src);
                resolve(new File([blob], file.name, { type: 'image/jpeg' }));
            }, 'image/jpeg', 0.8);
        };
        img.onerror = (e) => { URL.revokeObjectURL(img.src); reject(e); };
    });
}

form.onsubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) return;
    if (isProtected && userRole !== 'admin') {
        alert("이 문서는 보호되어 있어 관리자만 수정할 수 있습니다.");
        return;
    }
    saveBtn.disabled = true;
    saveBtn.textContent = '저장 중...';
    const updatedData = {
        name: document.getElementById('edit-name').value,
        details: editor.value,
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
        location.href = `detail.html#${charId}`;
    } catch (err) {
        alert("저장 실패: " + err.message);
        saveBtn.disabled = false;
        saveBtn.textContent = '저장하기';
    }
};

initToolbar();
loadInitialData();
