import { db, auth, getDocSafe } from './firebase-config.js';
import { doc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { CHARACTERS, CATEGORIES } from './data.js';

// R2 이미지 업로드 헬퍼 (Firebase Storage 대체)
async function uploadToR2(file, folder) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);
    const response = await fetch('/api/upload', { method: 'POST', body: formData });
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || '이미지 업로드 실패');
    }
    const result = await response.json();
    return result.url;
}

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
    
    // 헤더 사용자 정보 업데이트
    const info = document.getElementById('user-info');
    if (user) {
        if (info) {
            info.innerHTML = `
                <span style="color:white; font-size:12px; margin-right:10px;">${user.displayName || user.email.split('@')[0]}님</span>
                <a href="#" id="logout-btn" style="color:white; font-size:12px; text-decoration:none; border:1px solid rgba(255,255,255,0.3); padding:2px 5px; border-radius:3px;">로그아웃</a>
            `;
            document.getElementById('logout-btn').onclick = (e) => {
                e.preventDefault();
                if (confirm("로그아웃하시겠습니까?")) {
                    auth.signOut().then(() => location.reload());
                }
            };
        }

        if (user.email === "hodu@youshouyan.wiki") {
            userRole = 'admin';
        }

        try {
            const userSnap = await getDocSafe(doc(db, "users", user.uid));
            if (userSnap.exists()) {
                const userData = userSnap.data();
                if (userData.role === 'admin') userRole = 'admin';
            }
        } catch (e) { console.error("Firestore role check error:", e); }
    } else {
        if (info) {
            info.innerHTML = `<a href="auth.html" class="nav-link" style="color:white; text-decoration:none; font-size:12px; border:1px solid rgba(255,255,255,0.3); padding:2px 5px; border-radius:3px;">로그인</a>`;
        }
    }
    checkPermission();
});

function initCategorySelect() {
    if (!categorySelect) return;
    categorySelect.innerHTML = CATEGORIES.map(cat => `<option value="${cat}">${cat}</option>`).join('');
}

function checkPermission() {
    const container = document.querySelector('.editor-container');
    const formEl = document.getElementById('edit-form');
    const headerEl = document.querySelector('.editor-header');
    
    if (!container) return;

    let errorDiv = document.getElementById('permission-error-div');
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.id = 'permission-error-div';
        container.appendChild(errorDiv);
    }

    if (userRole !== 'admin') {
        if (formEl) formEl.style.display = 'none';
        if (headerEl) headerEl.style.display = 'none';

        const errorCode = currentUser ? '403' : '401';
        const errorMsg = currentUser ? '🔒 관리자 권한이 필요합니다' : '🔒 로그인이 필요합니다';
        const subMsg = currentUser ? '이 문서를 편집할 수 있는 권한이 없습니다.' : '편집을 진행하시려면 로그인이 필요합니다.';
        const actionBtn = currentUser ? 
            `<a href="detail.html#${charId}" style="padding:10px 25px; background:#f0f0f0; color:#333; border-radius:5px; text-decoration:none; font-weight:bold; display:inline-block;">상세 페이지로 돌아가기</a>` :
            `<a href="auth.html" style="padding:10px 25px; background:var(--primary-color); color:white; border-radius:5px; text-decoration:none; font-weight:bold; display:inline-block;">로그인하러 가기</a>`;

        errorDiv.innerHTML = `
            <div style="text-align:center; padding:100px 20px; background:white; border-radius:12px; box-shadow:0 4px 20px rgba(0,0,0,0.05); margin-top:50px;">
                <h1 style="color:#ff4d4f; font-size:5rem; margin-bottom:10px;">${errorCode}</h1>
                <h2 style="margin-bottom:20px; font-weight:800;">${errorMsg}</h2>
                <p style="color:#666; margin-bottom:40px; font-size:1.1rem;">${subMsg}</p>
                ${actionBtn}
            </div>`;
        errorDiv.style.display = 'block';
    } else {
        if (formEl) formEl.style.display = 'block';
        if (headerEl) headerEl.style.display = 'block';
        errorDiv.style.display = 'none';

        if (uploadMsg) {
            uploadMsg.textContent = "이미지 업로드 (인포박스용)";
            uploadMsg.style.color = "inherit";
        }
        saveBtn.disabled = false;
        saveBtn.title = "";
        if (form) {
            form.querySelectorAll('input, textarea, button, select').forEach(el => {
                el.disabled = false;
            });
        }
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
    // D1 데이터 로드
    try {
        console.log("Loading D1 doc for Edit:", charId);
        const response = await fetch(`/api/wiki/${encodeURIComponent(charId)}`);
        const baseData = CHARACTERS.find(c => c.id === charId) || { id: charId, name: charId };

        if (response.ok) {
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                const dbData = await response.json();
                console.log("D1 data received for edit:", dbData);
                const data = { 
                    ...baseData, 
                    name: dbData.name || baseData.name,
                    details: dbData.content || baseData.details,
                    category: dbData.category || baseData.category,
                    species: dbData.species || baseData.species,
                    nation: dbData.nation || baseData.nation,
                    alias: dbData.alias || baseData.alias,
                    birthday: dbData.birthday || baseData.birthday,
                    image: dbData.image || baseData.image,
                    gallery: dbData.gallery ? (typeof dbData.gallery === 'string' ? JSON.parse(dbData.gallery) : dbData.gallery) : (baseData.gallery || [])
                };
                fillForm(data);
            } else {
                console.warn("Expected JSON but received:", contentType);
                fillForm(baseData);
            }
        } else {
            console.log("D1 data not found, using base data.");
            fillForm(baseData);
        }
    } catch (err) { 
        console.error("D1 loading error:", err); 
        alert("데이터 로드 실패: " + err.message);
    }
}

function fillForm(data) {
    // [수정] DB에 저장된 이름이 있으면 우선 사용하고, 없으면 빈 값으로 둡니다.
    // (이전에는 ID값이 자동으로 채워져서 원치 않게 ID로 저장되는 문제가 있었습니다)
    const displayName = data.name || (CHARACTERS.find(c => c.id === charId)?.name) || "";

    const titleEl = document.getElementById('edit-page-title');
    if (titleEl) titleEl.textContent = `${displayName || charId} 문서 편집`;
    
    const nameInput = document.getElementById('edit-name');
    if (nameInput) nameInput.value = displayName;
    
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
            uploadStatus.textContent = 'R2에 업로드 중...';

            const url = await uploadToR2(compressedFile, `characters/${charId}`);

            document.getElementById('image-url').value = url;
            previewImg.src = url;
            previewImg.style.display = 'block';
            if (uploadMsg) uploadMsg.style.display = 'none';
            uploadStatus.textContent = '업로드 완료!';
            uploadStatus.style.color = 'green';
            setTimeout(() => { uploadStatus.style.display = 'none'; uploadStatus.style.color = ''; }, 3000);
            saveBtn.disabled = false;
            saveBtn.textContent = '저장하기';
            checkPermission();
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
                const url = await uploadToR2(compressed, `characters/${charId}/gallery`);
                currentGallery.push(url);
                renderGalleryPreview();
            } catch (err) {
                console.error("Gallery upload error:", err);
                alert("갤러리 사진 업로드 실패: " + err.message);
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

        const newName = document.getElementById('edit-name').value.trim();
        if (!newName) {
            alert("캐릭터 이름을 입력해 주세요.");
            saveBtn.disabled = false;
            saveBtn.textContent = '저장하기';
            return;
        }

        // [수정] D1의 title(고유 ID)을 입력한 name과 동일하게 맞춥니다.
        // 이름이 변경되면 데이터베이스의 PK도 함께 업데이트됩니다.
        const updatedData = {
            oldTitle: charId, // 현재 문서의 ID (이전 제목)
            title: newName,  // 새로운 ID (새 제목)
            name: newName,   // 표시 이름
            category: categorySelect ? categorySelect.value : '기타',
            content: editor.value,
            species: document.getElementById('info-species').value,
            nation: document.getElementById('info-nation').value,
            alias: document.getElementById('info-alias').value,
            birthday: document.getElementById('info-birthday').value,
            image: document.getElementById('image-url').value,
            gallery: currentGallery,
            author: currentUser.displayName || '익명'
        };
        try {
            const response = await fetch('/api/wiki', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedData)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || '서버 저장 실패');
            }
            
            // 이름이 바뀌었을 수 있으므로 새 주소(#이름)로 이동합니다.
            location.href = `detail.html#${encodeURIComponent(newName)}`;
        } catch (err) {
            alert("저장 실패: " + err.message);
            checkPermission();
            saveBtn.textContent = '저장하기';
        }
    };
}

initToolbar();
loadInitialData();
