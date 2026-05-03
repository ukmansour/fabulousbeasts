import { db, auth, storage, getDocSafe } from './firebase-config.js';
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { ref, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { CHARACTERS, CATEGORIES } from './data.js';

const charId = decodeURIComponent(location.hash.substring(1));
const form = document.getElementById('edit-form');
const saveBtn = document.getElementById('save-btn');
const dropZone = document.getElementById('drop-zone');
const imageInput = document.getElementById('image-input');
const previewImg = document.getElementById('preview-img');
const uploadStatus = document.getElementById('upload-status');
const uploadMsg = document.getElementById('upload-msg');
const editor = document.getElementById('edit-content');
const categorySelect = document.getElementById('edit-category');
const galleryDropZone = document.getElementById('gallery-drop-zone');
const galleryInput = document.getElementById('gallery-input');
const galleryPreviewList = document.getElementById('gallery-preview-list');

let currentGallery = [];

let currentUser = null;
let userRole = 'member';
const MAX_SIZE_MB = 25;

onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    userRole = 'member';
    
    if (user) {
        if (user.email === "hodu@youshouyan.wiki") {
            userRole = 'admin';
        }

        try {
            const userSnap = await getDocSafe(doc(db, "users", user.uid));
            if (userSnap.exists()) {
                const dbRole = userSnap.data().role || 'member';
                if (dbRole === 'admin') userRole = 'admin';
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
            form.querySelectorAll('input, textarea, button, select').forEach(el => {
                if (el.id !== 'global-search') el.disabled = true;
            });
        } else {
            uploadMsg.textContent = "🔒 편집을 위해 로그인이 필요합니다.";
            uploadMsg.style.display = 'block';
            saveBtn.disabled = true;
        }
    } else {
        if (uploadMsg.textContent.includes("🔒")) {
            uploadMsg.textContent = "이미지 업로드 (인포박스용)";
            uploadMsg.style.color = "inherit";
            if (previewImg.style.display !== 'block') {
                uploadMsg.style.display = 'block';
            } else {
                uploadMsg.style.display = 'none';
            }
        } else if (previewImg.style.display !== 'block') {
            uploadMsg.style.display = 'block';
        }
        
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
        console.log("Loading data for Edit:", charId);
        const baseData = CHARACTERS.find(c => c.id === charId) || {};
        const docRef = doc(db, "characters", charId);
        
        // onSnapshot 대신 getDocSafe 사용으로 읽기 최적화
        const snap = await getDocSafe(docRef);
        if (snap.exists()) {
            const dbData = snap.data();
            console.log("Edit data received from Firestore:", dbData);
            const data = { ...baseData, ...dbData };
            fillForm(data);
        } else {
            // 폴백 처리
            const rawId = location.hash.substring(1);
            if (rawId !== charId) {
                const fallbackSnap = await getDocSafe(doc(db, "characters", rawId));
                if (fallbackSnap.exists()) {
                    fillForm({ ...baseData, ...fallbackSnap.data() });
                } else {
                    fillForm(baseData);
                }
            } else {
                fillForm(baseData);
            }
        }
    } catch (err) { 
        console.error("LoadInitialData error:", err); 
        alert("편집기 초기화 실패: " + err.message);
    }
}

function fillForm(data) {
    const titleEl = document.getElementById('edit-page-title');
    if (titleEl) titleEl.textContent = `${data.name || charId} 문서 편집`;
    
    const nameInput = document.getElementById('edit-name');
    if (nameInput) nameInput.value = data.name || charId;
    
    if (categorySelect && data.category) categorySelect.value = data.category;
    if (editor) editor.value = data.details || '';
    
    const speciesInput = document.getElementById('info-species');
    const nationInput = document.getElementById('info-nation');
    const aliasInput = document.getElementById('info-alias');
    const birthdayInput = document.getElementById('info-birthday');
    const urlInput = document.getElementById('image-url');

    if (speciesInput) speciesInput.value = data.species || '';
    if (nationInput) nationInput.value = data.nation || '';
    if (aliasInput) aliasInput.value = data.alias || '';
    if (birthdayInput) birthdayInput.value = data.birthday || '';
    if (urlInput) urlInput.value = data.image || '';

    if (data.image && previewImg) {
        previewImg.src = data.image;
        previewImg.style.display = 'block';
        if (uploadMsg) uploadMsg.style.display = 'none';
    }

    if (data.gallery && Array.isArray(data.gallery)) {
        currentGallery = data.gallery;
        renderGalleryPreview();
    }
}

function renderGalleryPreview() {
    if (!galleryPreviewList) return;
    galleryPreviewList.innerHTML = currentGallery.map((url, idx) => `
        <div class="edit-gallery-item">
            <img src="${url}" alt="Gallery ${idx}">
            <div class="remove-gallery-img" onclick="window.removeGalleryImg(${idx})" title="삭제">⋮</div>
        </div>
    `).join('');
}

window.removeGalleryImg = (idx) => {
    if (confirm("정말로 이 사진을 지우시겠습니까?")) {
        currentGallery.splice(idx, 1);
        renderGalleryPreview();
    }
};

if (dropZone) {
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
}

if (imageInput) {
    imageInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (userRole !== 'admin') { alert("이미지를 업로드할 권한이 없습니다."); return; }
        if (file.size > MAX_SIZE_MB * 1024 * 1024) { alert(`파일 용량이 너무 큽니다. ${MAX_SIZE_MB}MB 이하만 가능합니다.`); return; }

        try {
            uploadStatus.style.display = 'block';
            uploadStatus.textContent = '이미지 압축 중...';
            saveBtn.disabled = true;
            saveBtn.textContent = '업로드 중...';

            const compressedFile = await compressImage(file);
            const fileName = file.name || 'image.jpg';
            const safeFileName = fileName.replace(/[^a-z0-9.]/gi, '_') || `img_${Date.now()}.jpg`;
            const uploadPath = `characters/${charId}/${Date.now()}_${safeFileName}`;
            
            const storageRef = ref(storage, uploadPath);
            const uploadTask = uploadBytesResumable(storageRef, compressedFile);

            uploadTask.on('state_changed', 
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    uploadStatus.textContent = `업로드 중... (${Math.round(progress)}%)`;
                }, 
                (error) => {
                    alert("업로드 실패: " + error.message);
                    saveBtn.disabled = false;
                    saveBtn.textContent = '저장하기';
                    checkPermission();
                }, 
                async () => {
                    const url = await getDownloadURL(uploadTask.snapshot.ref);
                    document.getElementById('image-url').value = url;
                    previewImg.src = url;
                    previewImg.style.display = 'block';
                    uploadStatus.textContent = '업로드 완료!';
                    uploadStatus.style.color = 'green';
                    setTimeout(() => { uploadStatus.style.display = 'none'; }, 3000);
                    saveBtn.disabled = false;
                    saveBtn.textContent = '저장하기';
                    checkPermission();
                }
            );
        } catch (err) {
            alert("에러 발생: " + err.message);
            saveBtn.disabled = false;
            saveBtn.textContent = '저장하기';
            checkPermission();
        }
    };
}

// 갤러리 업로드 처리
if (galleryDropZone) {
    galleryDropZone.onclick = () => {
        if (!saveBtn.disabled) galleryInput.click();
    };
}

if (galleryInput) {
    galleryInput.onchange = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        if (userRole !== 'admin') { alert("관리자만 사진을 추가할 수 있습니다."); return; }

        saveBtn.disabled = true;
        saveBtn.textContent = '사진 업로드 중...';

        for (const file of files) {
            try {
                const compressed = await compressImage(file);
                const safeName = file.name.replace(/[^a-z0-9.]/gi, '_');
                const path = `characters/${charId}/gallery/${Date.now()}_${safeName}`;
                const storageRef = ref(storage, path);
                const uploadTask = await uploadBytesResumable(storageRef, compressed);
                const url = await getDownloadURL(uploadTask.ref);
                currentGallery.push(url);
                renderGalleryPreview();
            } catch (err) {
                console.error("Gallery upload error:", err);
            }
        }
        saveBtn.disabled = false;
        saveBtn.textContent = '저장하기';
        checkPermission();
    };
}

async function compressImage(file) {
    return new Promise((resolve) => {
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
                    resolve(blob ? new File([blob], file.name, { type: 'image/jpeg' }) : file);
                }, 'image/jpeg', 0.8);
            } catch (e) {
                URL.revokeObjectURL(img.src);
                resolve(file);
            }
        };
        img.onerror = () => { URL.revokeObjectURL(img.src); resolve(file); };
    });
}

if (form) {
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
            gallery: currentGallery,
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
}

initToolbar();
loadInitialData();
