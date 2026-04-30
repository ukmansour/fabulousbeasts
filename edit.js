import { db, auth, storage } from './firebase-config.js';
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { ref, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { CHARACTERS, CATEGORIES } from './data.js';

const charId = location.hash.substring(1);
const form = document.getElementById('edit-form');
const saveBtn = document.getElementById('save-btn');
const dropZone = document.getElementById('drop-zone');
const imageInput = document.getElementById('image-input');
const previewImg = document.getElementById('preview-img');
const uploadStatus = document.getElementById('upload-status');
const uploadMsg = document.getElementById('upload-msg');
const editor = document.getElementById('edit-content');
const categorySelect = document.getElementById('edit-category');

let currentUser = null;
let userRole = 'member';
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
    checkPermission();
});

function initCategorySelect() {
    if (!categorySelect) return;
    categorySelect.innerHTML = CATEGORIES.map(cat => `<option value="${cat}">${cat}</option>`).join('');
}

function checkPermission() {
    const canEdit = userRole === 'admin';
    if (!canEdit) {
        if (currentUser) {
            uploadMsg.textContent = "🔒 관리자 전용 문서입니다. 편집 권한이 없습니다.";
            uploadMsg.style.display = 'block';
            uploadMsg.style.color = "red";
            saveBtn.disabled = true;
            saveBtn.title = "권한이 없습니다.";
            // 모든 입력 필드 비활성화
            form.querySelectorAll('input, textarea, button, select').forEach(el => {
                if (el.id !== 'global-search') el.disabled = true;
            });
        } else {
            uploadMsg.textContent = "🔒 편집을 위해 로그인이 필요합니다.";
            uploadMsg.style.display = 'block';
            saveBtn.disabled = true;
        }
    } else {
        // 관리자인 경우: UI 활성화 및 메시지 숨김
        uploadMsg.style.display = 'none';
        saveBtn.disabled = false;
        saveBtn.title = "";
        form.querySelectorAll('input, textarea, button, select').forEach(el => {
            el.disabled = false;
        });
    }
}

function initToolbar() {
    if (!editor) return;
    document.querySelectorAll('.toolbar-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault();
            if (saveBtn.disabled) return;
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

            editor.focus();
            const before = text.substring(0, start);
            const after = text.substring(end);
            editor.value = before + replacement + after;
            
            const newCursorPos = start + replacement.length;
            editor.setSelectionRange(newCursorPos, newCursorPos);
        };
    });
}

async function loadInitialData() {
    if (!charId) return;
    initCategorySelect();
    try {
        const baseData = CHARACTERS.find(c => c.id === charId) || {};
        const docRef = doc(db, "characters", charId);
        const snap = await getDoc(docRef);
        const dbData = snap.exists() ? snap.data() : {};
        const data = { ...baseData, ...dbData };

        document.getElementById('edit-page-title').textContent = `${data.name || charId} 문서 편집`;
        document.getElementById('edit-name').value = data.name || charId;
        if (categorySelect && data.category) categorySelect.value = data.category;
        
        editor.value = data.details || '';
        document.getElementById('info-species').value = data.species || '';
        document.getElementById('info-nation').value = data.nation || '';
        document.getElementById('info-alias').value = data.alias || '';
        document.getElementById('info-birthday').value = data.birthday || '';
        document.getElementById('image-url').value = data.image || '';

        if (data.image) {
            previewImg.src = data.image;
            previewImg.style.display = 'block';
        }
    } catch (err) { console.error(err); }
}

dropZone.onclick = () => {
    if (saveBtn.disabled) {
        if (!currentUser) {
            alert("로그인이 필요합니다.");
            location.href = 'auth.html';
        } else if (userRole !== 'admin') {
            alert("편집 권한(관리자)이 없습니다.");
        } else {
            alert("페이지를 불러오는 중입니다. 잠시만 기다려주세요.");
        }
        return;
    }
    imageInput.click();
};

imageInput.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // 권한 확인 및 상태 체크
    if (userRole !== 'admin') {
        alert("이미지를 업로드할 권한이 없습니다.");
        return;
    }
    
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        alert(`파일 용량이 너무 큽니다. ${MAX_SIZE_MB}MB 이하만 가능합니다.`);
        return;
    }
    
    if (!charId) { alert("캐릭터 ID가 유효하지 않습니다."); return; }
    if (!currentUser) { alert("로그인이 필요합니다."); location.href = 'auth.html'; return; }

    try {
        uploadStatus.style.display = 'block';
        uploadStatus.textContent = '이미지 압축 중...';
        saveBtn.disabled = true;
        saveBtn.textContent = '업로드 중...';

        const compressedFile = await compressImage(file);
        console.log("File prepared for upload:", compressedFile.name, compressedFile.size);

        const fileName = file.name || 'image.jpg';
        const safeFileName = fileName.replace(/[^a-z0-9.]/gi, '_') || `img_${Date.now()}.jpg`;
        const uploadPath = `characters/${charId}/${Date.now()}_${safeFileName}`;
        console.log("Uploading to path:", uploadPath);
        
        const storageRef = ref(storage, uploadPath);
        
        uploadStatus.textContent = '업로드 시작...';
        const uploadTask = uploadBytesResumable(storageRef, compressedFile);

        uploadTask.on('state_changed', 
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                uploadStatus.textContent = `업로드 중... (${Math.round(progress)}%)`;
            }, 
            (error) => {
                console.error("Upload error:", error);
                alert("업로드 실패: " + error.message);
                uploadStatus.textContent = '업로드 실패';
                uploadStatus.style.color = 'red';
                saveBtn.disabled = false;
                saveBtn.textContent = '저장하기';
                checkPermission();
            }, 
            async () => {
                try {
                    const url = await getDownloadURL(uploadTask.snapshot.ref);
                    document.getElementById('image-url').value = url;
                    previewImg.src = url;
                    previewImg.style.display = 'block';
                    uploadStatus.textContent = '업로드 완료!';
                    uploadStatus.style.color = 'green';
                    
                    // 3초 후 상태 메시지 숨김
                    setTimeout(() => {
                        uploadStatus.style.display = 'none';
                        uploadStatus.style.color = 'var(--primary-color)';
                    }, 3000);
                    
                    saveBtn.disabled = false;
                    saveBtn.textContent = '저장하기';
                    checkPermission();
                } catch (urlErr) {
                    alert("URL 가져오기 실패: " + urlErr.message);
                    saveBtn.disabled = false;
                    saveBtn.textContent = '저장하기';
                }
            }
        );
    } catch (err) {
        console.error("Compression/General error:", err);
        alert("에러 발생: " + err.message);
        saveBtn.disabled = false;
        saveBtn.textContent = '저장하기';
        checkPermission();
    }
};

async function compressImage(file) {
    return new Promise((resolve) => {
        console.log("Starting image compression...");
        const img = new Image();
        img.src = URL.createObjectURL(file);
        img.onload = () => {
            try {
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
                    if (blob) {
                        console.log("Compression successful");
                        resolve(new File([blob], file.name, { type: 'image/jpeg' }));
                    } else {
                        console.warn("Canvas toBlob returned null, using original file");
                        resolve(file);
                    }
                }, 'image/jpeg', 0.8);
            } catch (e) {
                console.error("Compression error:", e);
                URL.revokeObjectURL(img.src);
                resolve(file);
            }
        };
        img.onerror = (e) => { 
            console.error("Image load error for compression:", e);
            URL.revokeObjectURL(img.src); 
            resolve(file); 
        };
    });
}

form.onsubmit = async (e) => {
    e.preventDefault();
    if (!currentUser || saveBtn.disabled) return;
    
    saveBtn.disabled = true;
    saveBtn.textContent = '저장 중...';
    const updatedData = {
        name: document.getElementById('edit-name').value,
        category: categorySelect ? categorySelect.value : '기타',
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
        checkPermission();
        saveBtn.textContent = '저장하기';
    }
};

initToolbar();
loadInitialData();
