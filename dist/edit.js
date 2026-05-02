import { db, auth, storage } from './firebase-config.js';
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
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
    userRole = 'member'; // 초기화
    
    if (user) {
        // [중요] 마스터 관리자 계정은 즉시 admin 권한 부여
        if (user.email === "hodu@youshouyan.wiki") {
            userRole = 'admin';
        }

        try {
            const userSnap = await getDoc(doc(db, "users", user.uid));
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
        console.log("Loading data for Edit:", charId);
        const baseData = CHARACTERS.find(c => c.id === charId) || {};
        const docRef = doc(db, "characters", charId);
        
        onSnapshot(docRef, (snap) => {
            if (snap.exists()) {
                const dbData = snap.data();
                console.log("Edit data received from Firestore:", dbData);
                const data = { ...baseData, ...dbData };
                fillForm(data);
            } else {
                // [폴백] 인코딩된 ID로도 시도
                const rawId = location.hash.substring(1);
                if (rawId !== charId) {
                    console.log("Trying Edit fallback with raw ID:", rawId);
                    getDoc(doc(db, "characters", rawId)).then(fallbackSnap => {
                        if (fallbackSnap.exists()) {
                            fillForm({ ...baseData, ...fallbackSnap.data() });
                        } else {
                            console.log("No document found for Edit (Decoded & Raw)");
                            fillForm(baseData);
                        }
                    });
                } else {
                    console.log("No document found for Edit:", charId);
                    fillForm(baseData);
                }
            }
        }, (error) => {
            console.error("Edit load snapshot error:", error);
            alert("편집 데이터를 불러오는데 실패했습니다: " + error.message);
        });
    } catch (err) { 
        console.error("LoadInitialData error:", err); 
        alert("편집기 초기화 실패: " + err.message);
    }
}

function fillForm(data) {
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
        uploadMsg.style.display = 'none';
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
        
        if (userRole !== 'admin') {
            alert("관리자만 사진을 추가할 수 있습니다.");
            return;
        }

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
                alert(`${file.name} 업로드 실패: ${err.message}`);
            }
        }
        
        saveBtn.disabled = false;
        saveBtn.textContent = '저장하기';
        checkPermission();
    };
}

const clearAllBtn = document.getElementById('gallery-clear-all');
if (clearAllBtn) {
    clearAllBtn.onclick = () => {
        if (confirm("갤러리의 모든 사진을 삭제하시겠습니까?")) {
            currentGallery = [];
            renderGalleryPreview();
        }
    };
}

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
        gallery: currentGallery, // 갤러리 추가
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
