import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ===== 상태 =====
let currentUser = null;
let userRole = 'guest';
let allPosts = [];          // 전체 게시글 캐시
let filteredPosts = [];     // 현재 필터/검색 적용된 게시글
let currentCat = '전체';
let currentPage = 1;
let currentOpenPostId = null;
const POSTS_PER_PAGE = 20;

// ===== 인증 상태 감지 =====
onAuthStateChanged(auth, async (user) => {
    const info = document.getElementById('user-info');
    if (!info) return;

    if (user) {
        currentUser = user;

        // 로그인 유저 D1 동기화
        try {
            fetch('/api/user/role', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    uid: user.uid,
                    nickname: user.displayName || user.email?.split('@')[0] || '유저',
                    email: user.email || '',
                    role: 'member',
                    secret: 'SYNC_ONLY'
                })
            });
        } catch (e) { /* silent */ }

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
                            return;
                        }
                        isAdmin = data.role === 'admin';
                        sessionStorage.setItem(`role_${user.uid}`, data.role);
                    }
                } catch (e) { /* silent */ }
            }
        }

        userRole = isAdmin ? 'admin' : 'member';
        console.log('커뮤니티 userRole:', userRole, 'isAdmin:', isAdmin, 'uid:', user.uid);

        info.innerHTML = `
            ${isAdmin ? `<a href="admin.html" class="nav-link" style="border:1px solid rgba(255,255,255,0.3);padding:0.2rem 0.5rem;border-radius:3px;">관리자</a>` : ''}
            <span style="color:white;font-size:0.75rem;">${nickname}님</span>
            <a href="#" class="nav-link" id="logout-btn">로그아웃</a>
        `;

        document.getElementById('logout-btn')?.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm('로그아웃하시겠습니까?')) {
                sessionStorage.removeItem(`role_${user.uid}`);
                signOut(auth).then(() => location.reload());
            }
        });

    } else {
        currentUser = null;
        userRole = 'guest';
        info.innerHTML = `<a href="auth.html" class="nav-link">로그인</a>`;
    }

    // 글쓰기 버튼 활성화 여부
    const writeBtn = document.getElementById('btn-open-write');
    if (writeBtn) {
        writeBtn.disabled = !currentUser;
        writeBtn.title = currentUser ? '' : '로그인 후 글을 작성할 수 있습니다';
    }

    // 현재 열려있는 게시글 상세가 있으면 삭제 버튼 재갱신
    if (currentOpenPostId !== null) {
        updateDeleteButtonVisibility();
    }
});

// ===== 초기화 =====
document.addEventListener('DOMContentLoaded', () => {
    loadPosts();
    bindEvents();
    
    // URL 파라미터로 post ID가 있으면 해당 게시글 모달 열기
    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get('post');
    if (postId) {
        // 게시글 로드 후 모달 열기
        setTimeout(() => {
            openDetailModal(parseInt(postId, 10));
            // URL에서 파라미터 제거 (깔끔하게)
            window.history.replaceState({}, document.title, window.location.pathname);
        }, 500);
    }
});

function bindEvents() {
    // 카테고리 탭
    document.querySelectorAll('.community-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.community-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentCat = tab.dataset.cat;
            currentPage = 1;
            applyFilterAndRender();
        });
    });

    // 검색
    document.getElementById('btn-search')?.addEventListener('click', () => {
        currentPage = 1;
        applyFilterAndRender();
    });
    document.getElementById('search-input')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            currentPage = 1;
            applyFilterAndRender();
        }
    });

    // 글쓰기 모달
    document.getElementById('btn-open-write')?.addEventListener('click', openWriteModal);
    document.getElementById('write-modal-close')?.addEventListener('click', closeWriteModal);
    document.getElementById('write-cancel-btn')?.addEventListener('click', closeWriteModal);
    document.getElementById('write-modal')?.addEventListener('click', (e) => {
        if (e.target === document.getElementById('write-modal')) closeWriteModal();
    });
    document.getElementById('write-submit-btn')?.addEventListener('click', submitPost);

    // 이미지 업로드 미리보기
    const imageInput = document.getElementById('write-image');
    const previewDiv = document.getElementById('image-preview');
    const previewImg = document.getElementById('preview-img');
    const removeBtn = document.getElementById('remove-image-btn');

    if (imageInput) {
        imageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    previewImg.src = ev.target.result;
                    previewDiv.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        });
    }

    if (removeBtn) {
        removeBtn.addEventListener('click', () => {
            imageInput.value = '';
            previewDiv.style.display = 'none';
            previewImg.src = '';
        });
    }

    // 상세 모달 닫기
    document.getElementById('detail-close-btn')?.addEventListener('click', closeDetailModal);
    document.getElementById('detail-modal')?.addEventListener('click', (e) => {
        if (e.target === document.getElementById('detail-modal')) closeDetailModal();
    });

    // 게시글 삭제
    document.getElementById('detail-delete-btn')?.addEventListener('click', deleteCurrentPost);
}

// ===== 게시글 로드 =====
async function loadPosts() {
    const wrap = document.getElementById('post-list-wrap');
    try {
        const res = await fetch('/api/community/posts');
        if (!res.ok) throw new Error('fetch failed');
        allPosts = await res.json();
        applyFilterAndRender();
    } catch (e) {
        console.error(e);
        if (wrap) wrap.innerHTML = `
            <div class="post-empty">
                <div class="empty-icon"></div>
                <div>게시글을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</div>
            </div>`;
    }
}

// ===== 필터 + 검색 + 렌더 =====
function applyFilterAndRender() {
    const searchType = document.getElementById('search-type')?.value || 'title';
    const keyword = (document.getElementById('search-input')?.value || '').trim().toLowerCase();

    filteredPosts = allPosts.filter(p => {
        // 카테고리 필터 (title prefix 규칙: "[자유]제목" 형식으로 저장된 경우 파싱)
        if (currentCat !== '전체') {
            const cat = extractCategory(p.title);
            if (cat !== currentCat) return false;
        }

        // 검색 필터
        if (keyword) {
            if (searchType === 'title' && !p.title.toLowerCase().includes(keyword)) return false;
            if (searchType === 'content' && !p.content.toLowerCase().includes(keyword)) return false;
            if (searchType === 'author' && !p.author.toLowerCase().includes(keyword)) return false;
        }

        return true;
    });

    renderPosts();
    renderPagination();
    updatePostCountLabel();
}

// 제목에서 카테고리 태그 파싱: "[자유] 제목" → "자유"
function extractCategory(title) {
    const m = title.match(/^\[([^\]]+)\]/);
    return m ? m[1] : '자유';
}

function stripCategoryTag(title) {
    return title.replace(/^\[[^\]]+\]\s*/, '');
}

// ===== 게시글 렌더 =====
function renderPosts() {
    const wrap = document.getElementById('post-list-wrap');
    if (!wrap) return;

    if (filteredPosts.length === 0) {
        wrap.innerHTML = `
            <div class="post-empty">
                <div class="empty-icon"></div>
                <div>${currentCat !== '전체' ? `[${currentCat}] 카테고리에 ` : ''}게시글이 없습니다.<br>첫 번째 글을 남겨보세요!</div>
            </div>`;
        return;
    }

    const start = (currentPage - 1) * POSTS_PER_PAGE;
    const pagePosts = filteredPosts.slice(start, start + POSTS_PER_PAGE);
    // 번호는 전체 기준 내림차순
    const totalCount = filteredPosts.length;

    const rows = pagePosts.map((p, i) => {
        const num = totalCount - start - i;
        const date = formatDate(p.created_at);
        const displayTitle = stripCategoryTag(p.title);
        const cat = extractCategory(p.title);
        const commentBadge = p.comment_count > 0
            ? `<span class="comment-count">[${p.comment_count}]</span>` : '';
        const hasImage = p.image ? '📷 ' : ''; // 이미지 아이콘

        return `
            <div class="post-row" data-id="${p.id}">
                <span class="col-num">${num}</span>
                <span class="col-title">
                    <span class="notice-badge">${cat}</span>
                    ${hasImage}${escHtml(displayTitle)}${commentBadge}
                </span>
                <span class="col-author">${escHtml(p.author)}</span>
                <span class="col-date">${date}</span>
                <span class="col-views">${p.comment_count ?? 0}</span>
            </div>`;
    }).join('');

    wrap.innerHTML = rows;

    wrap.querySelectorAll('.post-row').forEach(row => {
        row.addEventListener('click', () => {
            openDetailModal(parseInt(row.dataset.id, 10));
        });
    });
}

// ===== 페이지네이션 =====
function renderPagination() {
    const el = document.getElementById('pagination');
    if (!el) return;

    const totalPages = Math.ceil(filteredPosts.length / POSTS_PER_PAGE);
    if (totalPages <= 1) { el.innerHTML = ''; return; }

    const maxVisible = 7;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);

    let html = '';
    html += `<div class="page-btn ${currentPage === 1 ? 'disabled' : ''}" data-page="${currentPage - 1}">‹</div>`;
    for (let i = start; i <= end; i++) {
        html += `<div class="page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</div>`;
    }
    html += `<div class="page-btn ${currentPage === totalPages ? 'disabled' : ''}" data-page="${currentPage + 1}">›</div>`;

    el.innerHTML = html;

    el.querySelectorAll('.page-btn:not(.disabled):not(.active)').forEach(btn => {
        btn.addEventListener('click', () => {
            currentPage = parseInt(btn.dataset.page, 10);
            renderPosts();
            renderPagination();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });
}

function updatePostCountLabel() {
    const label = document.getElementById('post-count-label');
    if (label) label.textContent = `총 ${filteredPosts.length}개`;
}

// ===== 글쓰기 모달 =====
function openWriteModal() {
    if (!currentUser) {
        if (confirm('로그인 후 이용해 주세요.\n\n로그인 페이지로 이동하시겠습니까?')) {
            window.location.href = 'auth.html';
        }
        return;
    }
    document.getElementById('write-title').value = '';
    document.getElementById('write-content').value = '';
    document.getElementById('write-image').value = '';
    document.getElementById('image-preview').style.display = 'none';
    document.getElementById('preview-img').src = '';
    document.getElementById('write-modal').classList.add('active');
    document.getElementById('write-title').focus();
}

function closeWriteModal() {
    document.getElementById('write-modal').classList.remove('active');
}

async function submitPost() {
    if (!currentUser) {
        alert('게시글을 작성하려면 로그인이 필요합니다.');
        return;
    }

    const cat = document.getElementById('write-category').value;
    const rawTitle = document.getElementById('write-title').value.trim();
    const content = document.getElementById('write-content').value.trim();
    const imageInput = document.getElementById('write-image');

    if (!rawTitle) { alert('제목을 입력해 주세요.'); return; }
    if (!content) { alert('내용을 입력해 주세요.'); return; }
    if (rawTitle.length > 100) { alert('제목은 100자 이내로 입력해 주세요.'); return; }

    // 카테고리를 제목 앞에 태그로 붙여서 저장 (기존 API 호환)
    const title = `[${cat}] ${rawTitle}`;

    const submitBtn = document.getElementById('write-submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = '등록 중...';

    let imageUrl = null;

    try {
        // 이미지 업로드 (있는 경우)
        if (imageInput.files && imageInput.files[0]) {
            const file = imageInput.files[0];
            
            // 파일 크기 체크 (5MB 제한)
            if (file.size > 5 * 1024 * 1024) {
                alert('이미지 크기는 5MB 이하만 가능합니다.');
                submitBtn.disabled = false;
                submitBtn.textContent = '등록';
                return;
            }

            submitBtn.textContent = '이미지 업로드 중...';
            const formData = new FormData();
            formData.append('file', file);
            formData.append('folder', 'community');

            const uploadRes = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            if (uploadRes.ok) {
                const uploadData = await uploadRes.json();
                imageUrl = uploadData.url;
            } else {
                throw new Error('이미지 업로드 실패');
            }
        }

        // 게시글 저장
        submitBtn.textContent = '게시글 등록 중...';
        const payload = {
            uid: currentUser.uid,
            author: currentUser.displayName || currentUser.email?.split('@')[0] || '익명 유저',
            title: title,
            content: content,
            image: imageUrl || ''
        };

        console.log('게시글 전송 데이터:', payload); // 디버깅용

        const res = await fetch('/api/community/posts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            closeWriteModal();
            await loadPosts();
            // 방금 쓴 글이 첫 번째 → 1페이지로 이동
            currentPage = 1;
            currentCat = '전체';
            document.querySelectorAll('.community-tab').forEach(t => {
                t.classList.toggle('active', t.dataset.cat === '전체');
            });
            applyFilterAndRender();
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

// ===== 상세 모달 =====
async function openDetailModal(postId) {
    currentOpenPostId = postId;
    const modal = document.getElementById('detail-modal');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    // 캐시에서 게시글 찾기
    const post = allPosts.find(p => p.id === postId);
    if (!post) {
        closeDetailModal();
        alert('게시글을 찾을 수 없습니다.');
        return;
    }

    // 본문 렌더
    const displayTitle = stripCategoryTag(post.title);
    const cat = extractCategory(post.title);
    const dateStr = formatDateFull(post.created_at);

    document.getElementById('detail-title').textContent = displayTitle;
    document.getElementById('detail-author').textContent = post.author;
    document.getElementById('detail-date').textContent = dateStr;
    document.getElementById('detail-category').textContent = cat;
    
    const bodyEl = document.getElementById('detail-body');
    bodyEl.innerHTML = '';
    
    // 이미지가 있으면 표시
    if (post.image) {
        console.log('게시글 이미지 URL:', post.image);
        const imgWrapper = document.createElement('div');
        imgWrapper.style.cssText = 'position: relative; margin-bottom: 1rem;';
        
        const imgEl = document.createElement('img');
        imgEl.src = post.image;
        imgEl.alt = '게시글 이미지';
        imgEl.style.cssText = 'max-width: 100%; height: auto; border-radius: 8px; cursor: zoom-in; display: block;';
        imgEl.onload = () => console.log('이미지 로드 성공:', post.image);
        imgEl.onclick = () => {
            // 이미지 확대 보기 모달
            const modal = document.createElement('div');
            modal.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.9); z-index: 9999; display: flex; align-items: center; justify-content: center; cursor: zoom-out;';
            const largeImg = document.createElement('img');
            largeImg.src = post.image;
            largeImg.style.cssText = 'max-width: 90%; max-height: 90%; border-radius: 8px;';
            modal.appendChild(largeImg);
            modal.onclick = () => modal.remove();
            document.body.appendChild(modal);
        };
        imgEl.onerror = () => {
            console.error('이미지 로드 실패:', post.image);
            imgEl.style.display = 'none';
            const errorMsg = document.createElement('div');
            errorMsg.textContent = '이미지를 불러올 수 없습니다.';
            errorMsg.style.cssText = 'color: #868e96; font-size: 0.85rem; padding: 1rem; background: #f8f9fa; border-radius: 6px; margin-bottom: 1rem; text-align: center;';
            imgWrapper.appendChild(errorMsg);
        };
        imgWrapper.appendChild(imgEl);
        bodyEl.appendChild(imgWrapper);
    }
    
    // 본문 텍스트
    const contentEl = document.createElement('div');
    contentEl.textContent = post.content;
    bodyEl.appendChild(contentEl);

    updateDeleteButtonVisibility();
    renderCommentWriteArea(postId);
    await loadComments(postId);
}

function updateDeleteButtonVisibility() {
    const deleteBtn = document.getElementById('detail-delete-btn');
    if (!deleteBtn) return;
    const post = allPosts.find(p => p.id === currentOpenPostId);
    if (!post) { deleteBtn.style.display = 'none'; return; }

    const canDelete = currentUser && (currentUser.uid === post.uid || userRole === 'admin');
    deleteBtn.style.display = canDelete ? 'inline-flex' : 'none';
}

function closeDetailModal() {
    document.getElementById('detail-modal').classList.remove('active');
    document.body.style.overflow = '';
    currentOpenPostId = null;
}

async function deleteCurrentPost() {
    if (!currentOpenPostId || !currentUser) return;
    if (!confirm('게시글을 삭제하시겠습니까? 댓글도 모두 삭제됩니다.')) return;

    try {
        const res = await fetch('/api/community/posts/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: currentOpenPostId,
                uid: currentUser.uid,
                role: userRole
            })
        });

        if (res.ok) {
            closeDetailModal();
            await loadPosts();
            applyFilterAndRender();
        } else {
            const err = await res.json();
            alert(`삭제 실패: ${err.error || '권한이 없습니다.'}`);
        }
    } catch (e) {
        console.error(e);
        alert('삭제 중 오류가 발생했습니다.');
    }
}

// ===== 댓글 =====
function renderCommentWriteArea(postId) {
    const area = document.getElementById('comment-write-area');
    if (!area) return;

    if (currentUser) {
        area.innerHTML = `
            <div class="comment-write-wrap">
                <textarea id="comment-input" placeholder="따뜻한 댓글을 남겨보세요..."></textarea>
                <div class="comment-write-row">
                    <button class="btn-comment-submit" id="btn-comment-submit">댓글 등록</button>
                </div>
            </div>`;

        document.getElementById('btn-comment-submit').addEventListener('click', () => submitComment(postId));
        document.getElementById('comment-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) submitComment(postId);
        });
    } else {
        area.innerHTML = `
            <div class="comment-login-notice">
                댓글은 <a href="auth.html">로그인</a> 후 작성할 수 있습니다.
            </div>`;
    }
}

async function loadComments(postId) {
    const list = document.getElementById('comment-list');
    const countEl = document.getElementById('detail-comment-count');
    if (!list) return;

    try {
        const res = await fetch(`/api/community/comments?post_id=${postId}`);
        if (!res.ok) throw new Error('fetch failed');
        const comments = await res.json();

        if (countEl) countEl.textContent = comments.length;

        // 캐시의 comment_count도 갱신
        const cached = allPosts.find(p => p.id === postId);
        if (cached) cached.comment_count = comments.length;

        if (comments.length === 0) {
            list.innerHTML = `<div class="comment-empty">아직 댓글이 없습니다. 첫 댓글을 남겨보세요!</div>`;
            return;
        }

        list.innerHTML = comments.map(c => {
            const initial = (c.author || '?')[0].toUpperCase();
            const canDel = currentUser && (currentUser.uid === c.uid || userRole === 'admin');
            return `
                <div class="comment-item" data-comment-id="${c.id}">
                    <div class="comment-avatar">${initial}</div>
                    <div class="comment-body">
                        <div class="comment-header">
                            <span class="comment-author">${escHtml(c.author)}</span>
                            <span class="comment-time">${formatDateFull(c.created_at)}</span>
                            ${canDel ? `<button class="btn-comment-delete" data-id="${c.id}">삭제</button>` : ''}
                        </div>
                        <div class="comment-content">${escHtml(c.content)}</div>
                    </div>
                </div>`;
        }).join('');

        // 댓글 삭제 버튼 이벤트
        list.querySelectorAll('.btn-comment-delete').forEach(btn => {
            btn.addEventListener('click', () => deleteComment(parseInt(btn.dataset.id, 10), postId));
        });

    } catch (e) {
        console.error(e);
        list.innerHTML = `<div class="comment-empty">댓글을 불러오지 못했습니다.</div>`;
    }
}

async function submitComment(postId) {
    console.log('=== submitComment 시작 ===');
    console.log('postId:', postId);
    console.log('currentUser:', currentUser);
    
    if (!currentUser) {
        if (confirm('로그인 후 이용해 주세요.\n\n로그인 페이지로 이동하시겠습니까?')) {
            window.location.href = 'auth.html';
        }
        return;
    }

    const input = document.getElementById('comment-input');
    if (!input) {
        console.error('comment-input 요소를 찾을 수 없습니다');
        return;
    }
    
    const content = input.value.trim();
    console.log('댓글 내용:', content);
    
    if (!content) { 
        alert('댓글 내용을 입력해 주세요.'); 
        return; 
    }

    const btn = document.getElementById('btn-comment-submit');
    if (btn) btn.disabled = true;

    // 명시적으로 각 필드 확인
    const uid = currentUser?.uid;
    const displayName = currentUser?.displayName;
    const email = currentUser?.email;
    const author = displayName || email?.split('@')[0] || '익명 유저';

    console.log('필드 확인:');
    console.log('- post_id:', postId, typeof postId);
    console.log('- uid:', uid);
    console.log('- displayName:', displayName);
    console.log('- email:', email);
    console.log('- author:', author);
    console.log('- content:', content);

    const payload = {
        post_id: postId,
        uid: uid,
        author: author,
        content: content
    };

    console.log('댓글 전송 데이터:', payload);
    console.log('JSON 문자열:', JSON.stringify(payload));

    try {
        const res = await fetch('/api/community/comments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        console.log('API 응답 상태:', res.status);

        if (res.ok) {
            const result = await res.json();
            console.log('성공 응답:', result);
            input.value = '';
            await loadComments(postId);
            renderPosts();
        } else {
            const errorData = await res.json();
            console.error('댓글 작성 실패:', errorData);
            console.error('실패한 payload:', payload);
            alert(`댓글 작성에 실패했습니다: ${errorData.error || '알 수 없는 오류'}\n\n전송한 데이터를 콘솔에서 확인하세요.`);
        }
    } catch (e) {
        console.error('댓글 작성 오류:', e);
        alert('오류가 발생했습니다: ' + e.message);
    } finally {
        if (btn) btn.disabled = false;
    }
}

async function deleteComment(commentId, postId) {
    if (!confirm('댓글을 삭제하시겠습니까?')) return;

    try {
        const res = await fetch('/api/community/comments/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: commentId,
                uid: currentUser.uid,
                role: userRole
            })
        });

        if (res.ok) {
            await loadComments(postId);
            renderPosts();
        } else {
            alert('삭제에 실패했습니다.');
        }
    } catch (e) {
        console.error(e);
        alert('오류가 발생했습니다.');
    }
}

// ===== 유틸 =====
function escHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function formatDate(isoStr) {
    if (!isoStr) return '-';
    const d = new Date(isoStr.endsWith('Z') ? isoStr : isoStr + 'Z');
    return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDateFull(isoStr) {
    if (!isoStr) return '-';
    const d = new Date(isoStr.endsWith('Z') ? isoStr : isoStr + 'Z');
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
