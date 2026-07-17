import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let currentUser = null;
let userRole = 'guest';
let currentPostId = null;
let currentPost = null;

// URL에서 게시글 ID 추출
const urlParams = new URLSearchParams(window.location.search);
currentPostId = parseInt(urlParams.get('id'), 10);

if (!currentPostId || isNaN(currentPostId)) {
    document.getElementById('post-content').innerHTML = `
        <div class="error">
            <h2 style="font-size: 1.3rem; margin-bottom: 0.5rem;">❌ 잘못된 접근</h2>
            <p>게시글을 찾을 수 없습니다.</p>
            <a href="community.html" class="btn-back" style="margin-top: 1rem; display: inline-block;">커뮤니티로 돌아가기</a>
        </div>
    `;
}

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
                signOut(auth).then(() => location.reload());
            }
        });

    } else {
        currentUser = null;
        userRole = 'guest';
        info.innerHTML = `<a href="auth.html" class="nav-link">로그인</a>`;
    }

    // 게시글 로드
    if (currentPostId) {
        await loadPost();
    }
});

async function loadPost() {
    const container = document.getElementById('post-content');
    
    try {
        // 게시글 불러오기
        const res = await fetch('/api/community/posts');
        if (!res.ok) throw new Error('fetch failed');
        const posts = await res.json();
        
        currentPost = posts.find(p => p.id === currentPostId);
        
        if (!currentPost) {
            container.innerHTML = `
                <div class="error">
                    <h2 style="font-size: 1.3rem; margin-bottom: 0.5rem;">❌ 게시글을 찾을 수 없습니다</h2>
                    <p>삭제되었거나 존재하지 않는 게시글입니다.</p>
                    <a href="community.html" class="btn-back" style="margin-top: 1rem; display: inline-block;">커뮤니티로 돌아가기</a>
                </div>
            `;
            return;
        }

        renderPost();
        await loadComments();
        
    } catch (e) {
        console.error(e);
        container.innerHTML = `
            <div class="error">
                <h2 style="font-size: 1.3rem; margin-bottom: 0.5rem;">❌ 오류 발생</h2>
                <p>게시글을 불러오는 중 오류가 발생했습니다.</p>
                <a href="community.html" class="btn-back" style="margin-top: 1rem; display: inline-block;">커뮤니티로 돌아가기</a>
            </div>
        `;
    }
}

function renderPost() {
    const container = document.getElementById('post-content');
    
    const displayTitle = stripCategoryTag(currentPost.title);
    const cat = extractCategory(currentPost.title);
    const dateStr = formatDateFull(currentPost.created_at);
    
    // 삭제 버튼 표시 여부
    const canDelete = currentUser && (currentUser.uid === currentPost.uid || userRole === 'admin');
    
    let bodyHTML = '';
    
    // 이미지 표시 (단수형 image와 복수형 images 둘 다 지원)
    let imageUrls = [];
    
    console.log('현재 게시글 데이터:', currentPost);
    console.log('images 필드:', currentPost.images);
    console.log('image 필드:', currentPost.image);
    
    // images 필드가 있으면 (새 방식 - 여러 이미지)
    if (currentPost.images) {
        try {
            // 이미 배열인 경우
            if (Array.isArray(currentPost.images)) {
                imageUrls = currentPost.images;
            } 
            // 문자열인 경우 파싱
            else if (typeof currentPost.images === 'string' && currentPost.images.trim()) {
                imageUrls = JSON.parse(currentPost.images);
            }
            console.log('파싱된 이미지 URLs:', imageUrls);
        } catch (e) {
            console.error('이미지 파싱 오류:', e, '원본 데이터:', currentPost.images);
        }
    }
    // image 필드가 있으면 (기존 방식 - 단일 이미지)
    else if (currentPost.image) {
        imageUrls = [currentPost.image];
        console.log('단일 이미지 URL:', currentPost.image);
    }
    
    // 이미지들 표시
    if (imageUrls.length > 0) {
        bodyHTML += '<div style="display: flex; flex-direction: column; gap: 1rem; margin-bottom: 1.5rem;">';
        imageUrls.forEach(url => {
            bodyHTML += `
                <img src="${url}" 
                     alt="게시글 이미지" 
                     onclick="openImageModal('${url}')"
                     style="cursor: zoom-in; border-radius: 0; max-width: 100%;">
            `;
        });
        bodyHTML += '</div>';
    }
    
    // 동영상 표시 (videos 필드)
    let videoUrls = [];
    if (currentPost.videos) {
        try {
            // 이미 배열인 경우
            if (Array.isArray(currentPost.videos)) {
                videoUrls = currentPost.videos;
            } 
            // 문자열인 경우 파싱
            else if (typeof currentPost.videos === 'string' && currentPost.videos.trim()) {
                videoUrls = JSON.parse(currentPost.videos);
            }
            console.log('파싱된 동영상 URLs:', videoUrls);
        } catch (e) {
            console.error('동영상 파싱 오류:', e, '원본 데이터:', currentPost.videos);
        }
    }
    
    // 동영상들 표시
    if (videoUrls.length > 0) {
        bodyHTML += '<div style="display: flex; flex-direction: column; gap: 1rem; margin-bottom: 1.5rem;">';
        videoUrls.forEach(url => {
            bodyHTML += `
                <video controls style="width: 100%; max-width: 100%; border-radius: 0; background: #000;">
                    <source src="${url}" type="video/mp4">
                    브라우저가 동영상을 지원하지 않습니다.
                </video>
            `;
        });
        bodyHTML += '</div>';
    }
    
    bodyHTML += `<div>${escHtml(currentPost.content)}</div>`;
    
    container.innerHTML = `
        <div class="post-header">
            <h1>${escHtml(displayTitle)}</h1>
            <div class="post-meta">
                <div class="meta-left">
                    <span class="post-category">${cat}</span>
                    <span>작성자: <strong>${escHtml(currentPost.author)}</strong></span>
                    <span>${dateStr}</span>
                </div>
            </div>
        </div>
        
        <div class="post-body">${bodyHTML}</div>
        
        <div class="post-actions">
            <a href="community.html" class="btn-back">← 목록으로</a>
            ${canDelete ? `<button class="btn-delete" onclick="deletePost()">삭제</button>` : ''}
        </div>
        
        <div class="comment-section">
            <div class="comment-section-title">
                댓글 <span id="comment-count">0</span>
            </div>
            
            <div id="comment-write-area"></div>
            
            <div class="comment-list" id="comment-list">
                <div class="comment-empty">댓글을 불러오는 중...</div>
            </div>
        </div>
    `;
    
    renderCommentWriteArea();
}

function renderCommentWriteArea() {
    const area = document.getElementById('comment-write-area');
    if (!area) return;

    if (currentUser) {
        area.innerHTML = `
            <div class="comment-write-wrap">
                <textarea id="comment-input" placeholder="따뜻한 댓글을 남겨보세요..."></textarea>
                <div class="comment-write-row">
                    <button class="btn-comment-submit" onclick="submitComment()">댓글 등록</button>
                </div>
            </div>`;
    } else {
        area.innerHTML = `
            <div class="comment-login-notice">
                댓글은 <a href="auth.html">로그인</a> 후 작성할 수 있습니다.
            </div>`;
    }
}

async function loadComments() {
    const list = document.getElementById('comment-list');
    const countEl = document.getElementById('comment-count');
    if (!list) return;

    try {
        const res = await fetch(`/api/community/comments?post_id=${currentPostId}`);
        if (!res.ok) throw new Error('fetch failed');
        const comments = await res.json();

        if (countEl) countEl.textContent = comments.length;

        if (comments.length === 0) {
            list.innerHTML = `<div class="comment-empty">아직 댓글이 없습니다. 첫 댓글을 남겨보세요!</div>`;
            return;
        }

        list.innerHTML = comments.map(c => {
            const initial = (c.author || '?')[0].toUpperCase();
            const canDel = currentUser && (currentUser.uid === c.uid || userRole === 'admin');
            return `
                <div class="comment-item">
                    <div class="comment-avatar">${initial}</div>
                    <div class="comment-body">
                        <div class="comment-header">
                            <span class="comment-author">${escHtml(c.author)}</span>
                            <span class="comment-time">${formatDateFull(c.created_at)}</span>
                            ${canDel ? `<button class="btn-comment-delete" onclick="deleteComment(${c.id})">삭제</button>` : ''}
                        </div>
                        <div class="comment-content">${escHtml(c.content)}</div>
                    </div>
                </div>`;
        }).join('');

    } catch (e) {
        console.error(e);
        list.innerHTML = `<div class="comment-empty">댓글을 불러오지 못했습니다.</div>`;
    }
}

window.submitComment = async function() {
    if (!currentUser) {
        if (confirm('로그인 후 이용해 주세요.\n\n로그인 페이지로 이동하시겠습니까?')) {
            window.location.href = 'auth.html';
        }
        return;
    }

    const input = document.getElementById('comment-input');
    if (!input) return;
    
    const content = input.value.trim();
    if (!content) {
        alert('댓글 내용을 입력해 주세요.');
        return;
    }

    const payload = {
        post_id: currentPostId,
        uid: currentUser.uid,
        author: currentUser.displayName || currentUser.email?.split('@')[0] || '익명 유저',
        content: content
    };

    try {
        const res = await fetch('/api/community/comments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            input.value = '';
            await loadComments();
        } else {
            const err = await res.json();
            alert(`댓글 작성에 실패했습니다: ${err.error || '알 수 없는 오류'}`);
        }
    } catch (e) {
        console.error(e);
        alert('오류가 발생했습니다: ' + e.message);
    }
};

window.deleteComment = async function(commentId) {
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
            await loadComments();
        } else {
            alert('삭제에 실패했습니다.');
        }
    } catch (e) {
        console.error(e);
        alert('오류가 발생했습니다.');
    }
};

window.deletePost = async function() {
    if (!confirm('게시글을 삭제하시겠습니까? 댓글도 모두 삭제됩니다.')) return;

    try {
        const res = await fetch('/api/community/posts/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: currentPostId,
                uid: currentUser.uid,
                role: userRole
            })
        });

        if (res.ok) {
            alert('게시글이 삭제되었습니다.');
            window.location.href = 'community.html';
        } else {
            const err = await res.json();
            alert(`삭제 실패: ${err.error || '권한이 없습니다.'}`);
        }
    } catch (e) {
        console.error(e);
        alert('삭제 중 오류가 발생했습니다.');
    }
};

window.openImageModal = function(imageUrl) {
    const modal = document.createElement('div');
    modal.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.9); z-index: 9999; display: flex; align-items: center; justify-content: center; cursor: zoom-out;';
    
    const img = document.createElement('img');
    img.src = imageUrl;
    img.style.cssText = 'max-width: 90%; max-height: 90%; border-radius: 0;';
    
    modal.appendChild(img);
    modal.onclick = () => modal.remove();
    document.body.appendChild(modal);
};

// 유틸 함수
function extractCategory(title) {
    const m = title.match(/^\[([^\]]+)\]/);
    return m ? m[1] : '자유';
}

function stripCategoryTag(title) {
    return title.replace(/^\[[^\]]+\]\s*/, '');
}

function escHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function formatDateFull(isoStr) {
    if (!isoStr) return '-';
    const d = new Date(isoStr.endsWith('Z') ? isoStr : isoStr + 'Z');
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
