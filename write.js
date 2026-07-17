import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let currentUser = null;
let userRole = 'guest';

// 인증 상태 감지
onAuthStateChanged(auth, async (user) => {
    const info = document.getElementById('user-info');
    if (!info) return;

    if (user) {
        currentUser = user;

        const nickname = user.displayName || user.email?.split('@')[0] || '익명';
        const isSupreme = user.email === 'hodu@youshouyan.wiki';
        let isAdmin = isSupreme;

        if (!isSupreme) {
            const cached = sessionStorage.getItem(`role_${user.uid}`);
            if (cached) {
                isAdmin = cached === 'admin';
            } else {
                try {
                    const snap = await getDoc(doc(db, 'users', user.uid));
                    if (snap.exists()) {
                        const data = snap.data();
                        if (data.isBanned) {
                            alert('⚠️ 차단된 계정입니다.');
                            signOut(auth);
                            window.location.href = 'community.html';
                            return;
                        }
                        isAdmin = data.role === 'admin';
                        sessionStorage.setItem(`role_${user.uid}`, data.role);
                    }
                } catch (e) { /* silent */ }
            }
        }

        userRole = isAdmin ? 'admin' : 'member';

        info.innerHTML = `
            ${isAdmin ? `<a href="admin.html" class="nav-link" style="border:1px solid rgba(255,255,255,0.3);padding:0.2rem 0.5rem;border-radius:3px;">관리자</a>` : ''}
            <span style="color:white;font-size:0.75rem;">${nickname}님</span>
            <a href="#" class="nav-link" id="logout-btn">로그아웃</a>
        `;

        document.getElementById('logout-btn')?.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm('로그아웃하시겠습니까?')) {
                sessionStorage.removeItem(`role_${user.uid}`);
                signOut(auth).then(() => window.location.href = 'community.html');
            }
        });

        // 로그인 확인됨 - 글쓰기 폼 렌더링
        renderWriteForm();

    } else {
        currentUser = null;
        userRole = 'guest';
        info.innerHTML = `<a href="auth.html" class="nav-link">로그인</a>`;

        // 비로그인 상태 - 커뮤니티로 리다이렉트
        alert('로그인 후 이용해 주세요.');
        window.location.href = 'auth.html';
    }
});

function renderWriteForm() {
    const container = document.getElementById('write-container');
    
    container.innerHTML = `
        <div class="write-header">
            <h1>새 게시글 작성</h1>
        </div>

        <div class="write-form">
            <div class="write-field">
                <label class="write-label" for="write-category">카테고리</label>
                <select class="write-select" id="write-category">
                    <option value="자유">자유</option>
                    <option value="공지">공지</option>
                    <option value="질문">질문</option>
                    <option value="팬아트">팬아트</option>
                </select>
            </div>

            <div class="write-field">
                <label class="write-label" for="write-title">제목</label>
                <input type="text" class="write-input" id="write-title" placeholder="제목을 입력하세요" maxlength="100">
            </div>

            <div class="write-field">
                <label class="write-label" for="write-content">내용</label>
                <textarea class="write-textarea" id="write-content" placeholder="내용을 입력하세요&#10;(비속어나 스포일러 주의 태그 없는 스포일러는 삼가주세요)"></textarea>
            </div>

            <div class="write-field">
                <label class="write-label" for="write-images">이미지 첨부 (선택, 최대 5장)</label>
                <input type="file" class="write-input" id="write-images" accept="image/*" multiple style="padding: 0.5rem 0.8rem;">
                <div class="images-preview-wrap" id="images-preview">
                    <!-- 미리보기 이미지들이 여기 표시됩니다 -->
                </div>
            </div>

            <div class="write-field">
                <label class="write-label" for="write-videos">동영상 첨부 (선택, 최대 2개, 각 50MB 이하)</label>
                <input type="file" class="write-input" id="write-videos" accept="video/*" multiple style="padding: 0.5rem 0.8rem;">
                <div class="videos-preview-wrap" id="videos-preview">
                    <!-- 미리보기 동영상들이 여기 표시됩니다 -->
                </div>
            </div>
        </div>

        <div class="write-actions">
            <a href="community.html" class="btn-cancel">취소</a>
            <button class="btn-submit" id="submit-btn">등록</button>
        </div>
    `;

    // 이미지 미리보기 (여러 장)
    const imagesInput = document.getElementById('write-images');
    const imagesPreviewDiv = document.getElementById('images-preview');
    let selectedFiles = [];

    imagesInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        
        if (files.length > 5) {
            alert('이미지는 최대 5장까지 첨부할 수 있습니다.');
            return;
        }

        selectedFiles = files;
        renderImagePreviews();
    });

    function renderImagePreviews() {
        if (selectedFiles.length === 0) {
            imagesPreviewDiv.style.display = 'none';
            imagesPreviewDiv.innerHTML = '';
            return;
        }

        imagesPreviewDiv.style.display = 'flex';
        imagesPreviewDiv.innerHTML = '';

        selectedFiles.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = (ev) => {
                const item = document.createElement('div');
                item.className = 'preview-item';
                item.innerHTML = `
                    <img src="${ev.target.result}" alt="미리보기 ${index + 1}">
                    <button type="button" class="remove-btn" data-index="${index}">×</button>
                `;
                
                item.querySelector('.remove-btn').addEventListener('click', () => {
                    selectedFiles.splice(index, 1);
                    renderImagePreviews();
                    
                    // input 파일 목록 업데이트
                    const dt = new DataTransfer();
                    selectedFiles.forEach(f => dt.items.add(f));
                    imagesInput.files = dt.files;
                });
                
                imagesPreviewDiv.appendChild(item);
            };
            reader.readAsDataURL(file);
        });
    }

    // 동영상 미리보기 (여러 개)
    const videosInput = document.getElementById('write-videos');
    const videosPreviewDiv = document.getElementById('videos-preview');
    let selectedVideos = [];

    videosInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        
        if (files.length > 2) {
            alert('동영상은 최대 2개까지 첨부할 수 있습니다.');
            return;
        }

        // 각 파일 크기 체크 (50MB)
        for (const file of files) {
            if (file.size > 50 * 1024 * 1024) {
                alert(`"${file.name}"의 크기가 50MB를 초과합니다.`);
                return;
            }
        }

        selectedVideos = files;
        renderVideoPreviews();
    });

    function renderVideoPreviews() {
        if (selectedVideos.length === 0) {
            videosPreviewDiv.style.display = 'none';
            videosPreviewDiv.innerHTML = '';
            return;
        }

        videosPreviewDiv.style.display = 'flex';
        videosPreviewDiv.innerHTML = '';

        selectedVideos.forEach((file, index) => {
            const url = URL.createObjectURL(file);
            const item = document.createElement('div');
            item.className = 'preview-item';
            item.innerHTML = `
                <video src="${url}" controls style="width: 100%; height: 150px;"></video>
                <button type="button" class="remove-btn" data-index="${index}">×</button>
            `;
            
            item.querySelector('.remove-btn').addEventListener('click', () => {
                selectedVideos.splice(index, 1);
                renderVideoPreviews();
                
                // input 파일 목록 업데이트
                const dt = new DataTransfer();
                selectedVideos.forEach(f => dt.items.add(f));
                videosInput.files = dt.files;
            });
            
            videosPreviewDiv.appendChild(item);
        });
    }

    // 제출 버튼
    document.getElementById('submit-btn').addEventListener('click', submitPost);
}

async function submitPost() {
    if (!currentUser) {
        alert('로그인이 필요합니다.');
        window.location.href = 'auth.html';
        return;
    }

    const cat = document.getElementById('write-category').value;
    const rawTitle = document.getElementById('write-title').value.trim();
    const content = document.getElementById('write-content').value.trim();
    const imagesInput = document.getElementById('write-images');
    const videosInput = document.getElementById('write-videos');

    if (!rawTitle) {
        alert('제목을 입력해 주세요.');
        return;
    }
    if (!content) {
        alert('내용을 입력해 주세요.');
        return;
    }
    if (rawTitle.length > 100) {
        alert('제목은 100자 이내로 입력해 주세요.');
        return;
    }

    // 카테고리를 제목 앞에 태그로 붙여서 저장
    const title = `[${cat}] ${rawTitle}`;

    const submitBtn = document.getElementById('submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = '등록 중...';

    let imageUrls = [];
    let videoUrls = [];

    try {
        // 이미지 업로드 (여러 장)
        if (imagesInput.files && imagesInput.files.length > 0) {
            const files = Array.from(imagesInput.files);
            
            if (files.length > 5) {
                alert('이미지는 최대 5장까지 첨부할 수 있습니다.');
                submitBtn.disabled = false;
                submitBtn.textContent = '등록';
                return;
            }

            // 파일 크기 체크 (각 5MB 제한)
            for (const file of files) {
                if (file.size > 5 * 1024 * 1024) {
                    alert(`"${file.name}"의 크기가 5MB를 초과합니다.`);
                    submitBtn.disabled = false;
                    submitBtn.textContent = '등록';
                    return;
                }
            }

            // 각 이미지 업로드
            for (let i = 0; i < files.length; i++) {
                submitBtn.textContent = `이미지 업로드 중... (${i + 1}/${files.length})`;
                
                const formData = new FormData();
                formData.append('file', files[i]);
                formData.append('folder', 'community');

                const uploadRes = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData
                });

                if (uploadRes.ok) {
                    const uploadData = await uploadRes.json();
                    imageUrls.push(uploadData.url);
                } else {
                    throw new Error(`이미지 ${i + 1} 업로드 실패`);
                }
            }
        }

        // 동영상 업로드 (여러 개)
        if (videosInput.files && videosInput.files.length > 0) {
            const files = Array.from(videosInput.files);
            
            if (files.length > 2) {
                alert('동영상은 최대 2개까지 첨부할 수 있습니다.');
                submitBtn.disabled = false;
                submitBtn.textContent = '등록';
                return;
            }

            // 파일 크기 체크 (각 50MB 제한)
            for (const file of files) {
                if (file.size > 50 * 1024 * 1024) {
                    alert(`"${file.name}"의 크기가 50MB를 초과합니다.`);
                    submitBtn.disabled = false;
                    submitBtn.textContent = '등록';
                    return;
                }
            }

            // 각 동영상 업로드
            for (let i = 0; i < files.length; i++) {
                submitBtn.textContent = `동영상 업로드 중... (${i + 1}/${files.length})`;
                
                const formData = new FormData();
                formData.append('file', files[i]);
                formData.append('folder', 'community');

                const uploadRes = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData
                });

                if (uploadRes.ok) {
                    const uploadData = await uploadRes.json();
                    videoUrls.push(uploadData.url);
                } else {
                    throw new Error(`동영상 ${i + 1} 업로드 실패`);
                }
            }
        }

        // 게시글 저장 (이미지 URL들과 동영상 URL들을 JSON 배열로 저장)
        submitBtn.textContent = '게시글 등록 중...';
        const payload = {
            uid: currentUser.uid,
            author: currentUser.displayName || currentUser.email?.split('@')[0] || '익명 유저',
            title: title,
            content: content,
            images: JSON.stringify(imageUrls), // 여러 이미지 URL을 JSON으로 저장
            videos: JSON.stringify(videoUrls)  // 여러 동영상 URL을 JSON으로 저장
        };

        console.log('게시글 전송 데이터:', payload);

        const res = await fetch('/api/community/posts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            alert('게시글이 등록되었습니다!');
            window.location.href = 'community.html';
        } else {
            const err = await res.json();
            console.error('게시글 작성 실패:', err);
            alert(`등록 실패: ${err.error || '알 수 없는 오류'}`);
        }
    } catch (e) {
        console.error('게시글 작성 오류:', e);
        alert('게시글 등록 중 오류가 발생했습니다: ' + e.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '등록';
    }
}
