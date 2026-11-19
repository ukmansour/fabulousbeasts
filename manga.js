import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { CHARACTERS } from './data.js';

// ===== 상태 =====
let currentUser = null;
let userRole = 'guest';
let currentChapter = null;
let chapterPages = {};
let uploadedChapters = new Set();
let replyToCommentId = null;

const TOTAL_CHAPTERS = 1300;
const GROUP_SIZE = 100;

// ===== 헤더 검색 =====
const searchInput = document.getElementById('global-search');
const searchResults = document.getElementById('search-results');
if (searchInput) {
    searchInput.oninput = () => {
        const val = searchInput.value.trim().toLowerCase();
        if (val.length < 1) { searchResults.classList.remove('active'); return; }
        const matches = CHARACTERS.filter(c =>
            (c.name || '').toLowerCase().includes(val) || c.id.toLowerCase().includes(val)
        ).slice(0, 8);
        searchResults.innerHTML = matches.map(m =>
            `<a href="detail.html#${m.id}" class="search-item" style="display:block;text-decoration:none;color:inherit;">${m.name}</a>`
        ).join('');
        searchResults.classList.toggle('active', matches.length > 0);
    };
}

// ===== 인증 =====
onAuthStateChanged(auth, async (user) => {
    const info = document.getElementById('user-info');
    if (user) {
        currentUser = user;
        userRole = 'member';

        try {
            const snap = await getDoc(doc(db, 'users', user.uid));
            if (snap.exists()) {
                const data = snap.data();
                userRole = data.role || 'member';
                if (data.isBanned) { alert('차단된 계정입니다.'); return; }
            }
        } catch (e) { /* silent */ }

        if (user.email === 'hodu@youshouyan.wiki') userRole = 'admin';

        const nickname = user.displayName || user.email?.split('@')[0] || '유저';
        const isAdmin = userRole === 'admin';
        info.innerHTML = `
            ${isAdmin ? `<a href="admin.html" class="nav-link" style="border:1px solid rgba(255,255,255,0.3);padding:0.2rem 0.5rem;border-radius:3px;">관리자</a>` : ''}
            <span style="color:white;font-size:0.75rem;">${nickname}님</span>
            <a href="#" class="nav-link" id="logout-btn">로그아웃</a>
        `;
        document.getElementById('logout-btn')?.addEventListener('click', e => {
            e.preventDefault();
            if (confirm('로그아웃하시겠습니까?')) {
                import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js")
                    .then(({ signOut }) => signOut(auth).then(() => location.href = 'index.html'));
            }
        });

        const bell = document.getElementById('notification-bell');
        if (bell) bell.style.display = 'block';
    } else {
        currentUser = null;
        userRole = 'guest';
        info.innerHTML = `<a href="auth.html" class="nav-link">로그인</a>`;
    }

    // 댓글 입력폼 갱신
    updateCommentForm();
    if (currentChapter) loadComments(currentChapter);
});

// ===== 초기화: 화 목록 그룹 셀렉터 =====
function initGroupSelector() {
    const sel = document.getElementById('chapter-group-select');
    sel.innerHTML = '';
    const groupCount = Math.ceil(TOTAL_CHAPTERS / GROUP_SIZE);
    for (let g = 0; g < groupCount; g++) {
        const start = g * GROUP_SIZE + 1;
        const end = Math.min(start + GROUP_SIZE - 1, TOTAL_CHAPTERS);
        const opt = document.createElement('option');
        opt.value = g;
        opt.textContent = `${start}~${end}화`;
        sel.appendChild(opt);
    }
}

// ===== 업로드된 화 목록 조회 =====
async function loadUploadedChapters() {
    try {
        const res = await fetch('/api/manga/chapters');
        if (!res.ok) return;
        const data = await res.json();
        uploadedChapters = new Set(data.map(ch => Number(ch)));
    } catch (e) {
        console.error('챕터 목록 로드 실패:', e);
    }
}

// ===== 화 목록 렌더링 =====
function renderChapterList(groupIndex) {
    const list = document.getElementById('chapter-list');
    const start = groupIndex * GROUP_SIZE + 1;
    const end = Math.min(start + GROUP_SIZE - 1, TOTAL_CHAPTERS);

    let html = '';
    for (let ch = start; ch <= end; ch++) {
        const isUploaded = uploadedChapters.has(ch);
        const isActive = ch === currentChapter;
        html += `
            <div class="ch-item ${isActive ? 'active' : ''}" onclick="selectChapter(${ch})">
                <span class="ch-num">${ch}화</span>
                <span style="flex:1;font-size:0.85rem;color:#333;">제${ch}화</span>
                <span class="ch-status ${isUploaded ? '' : 'empty'}">
                    ${isUploaded ? '' : '미등록'}
                </span>
            </div>
        `;
    }
    list.innerHTML = html;
}

window.onGroupChange = function () {
    const g = parseInt(document.getElementById('chapter-group-select').value);
    renderChapterList(g);
};

// ===== 화 선택 =====
window.selectChapter = async function (chapterNum) {
    currentChapter = chapterNum;

    // 사이드바 활성 갱신
    document.querySelectorAll('.ch-item').forEach(el => {
        const num = parseInt(el.querySelector('.ch-num')?.textContent);
        el.classList.toggle('active', num === chapterNum);
    });

    // 뷰어 UI 표시
    document.getElementById('manga-placeholder').style.display = 'none';
    document.getElementById('manga-pages').style.display = 'block';
    document.getElementById('manga-nav-bar').style.display = 'flex';
    document.getElementById('manga-nav-bar-bottom').style.display = 'flex';
    document.getElementById('manga-info').style.display = 'block';
    document.getElementById('manga-comments').style.display = 'block';
    document.getElementById('manga-chapter-title').textContent = `제${chapterNum}화`;
    document.getElementById('page-indicator').textContent = `${chapterNum}화`;
    document.getElementById('page-indicator-bottom').textContent = `${chapterNum}화`;

    // 상단 버튼
    document.getElementById('btn-prev-ch').disabled = chapterNum <= 1;
    document.getElementById('btn-next-ch').disabled = chapterNum >= TOTAL_CHAPTERS;
    
    // 하단 버튼
    document.getElementById('btn-prev-ch-bottom').disabled = chapterNum <= 1;
    document.getElementById('btn-next-ch-bottom').disabled = chapterNum >= TOTAL_CHAPTERS;

    // 댓글 갱신
    updateCommentForm();
    loadComments(chapterNum);

    // 이미지 (캐시 무효화 - 항상 새로 불러오기)
    document.getElementById('manga-pages').innerHTML =
        `<div style="color:#888;padding:3rem;text-align:center;">이미지를 불러오는 중...</div>`;

    const pages = await buildPageList(chapterNum);
    chapterPages[chapterNum] = pages;
    renderPages(pages);
};

// ===== 페이지 목록 생성 =====
async function buildPageList(chapterNum) {
    const folderStart = Math.floor((chapterNum - 1) / 100) * 100 + 1;
    const folderEnd = folderStart + 99;
    const folderStartPad = String(folderStart).padStart(4, '0');
    const folderEndPad = String(folderEnd).padStart(4, '0');
    const paddedNum = String(chapterNum).padStart(4, '0');

    // 캐시 무효화를 위한 타임스탬프 (매번 새로 불러오기)
    const timestamp = Date.now();

    // 형식 1: 폴더 구조 (0101화 ~ 0200화/0101화.jpg)
    const folderName = `${folderStartPad}화 ~ ${folderEndPad}화`;
    const fileName = `${paddedNum}화`;
    const base1 = `/api/r2/${encodeURIComponent(folderName)}/${encodeURIComponent(fileName)}`;

    // 형식 2: 루트 4자리 (0795화.jpg)
    const base2 = `/api/r2/${encodeURIComponent(fileName)}`;

    // 형식 3: 루트 패딩 없음 (1207.jpg)
    const base3 = `/api/r2/${chapterNum}`;

    return [{ page_num: 1, base1, base2, base3, timestamp }];
}

// ===== 이미지 렌더링 =====
function renderPages(pages) {
    const wrap = document.getElementById('manga-pages');
    if (!pages || pages.length === 0) {
        wrap.innerHTML = `<div style="color:#888;padding:3rem;text-align:center;">아직 업로드된 이미지가 없습니다.</div>`;
        return;
    }

    wrap.innerHTML = pages.map((page) => {
        const { base1, base2, base3, timestamp } = page;
        const v = timestamp ? `?v=${timestamp}` : '';
        return `
            <div class="manga-page-row" style="max-width:800px;margin:0 auto;">
                <img class="img-s1" src="${base1}.jpg${v}" style="width:100%;display:block;"
                     onload="this.closest('.manga-page-row').querySelectorAll('.img-s2,.img-s3,.manga-ab-wrap').forEach(e=>e.style.display='none');"
                     onerror="this.style.display='none';">
                <img class="img-s2" src="${base2}.jpg${v}" style="width:100%;display:block;"
                     onload="this.closest('.manga-page-row').querySelectorAll('.img-s3,.manga-ab-wrap').forEach(e=>e.style.display='none');"
                     onerror="this.style.display='none';">
                <img class="img-s3" src="${base3}.jpg${v}" style="width:100%;display:block;"
                     onload="this.closest('.manga-page-row').querySelector('.manga-ab-wrap').style.display='none';"
                     onerror="this.style.display='none'; this.closest('.manga-page-row').querySelector('.manga-ab-wrap').style.display='flex';">
                <div class="manga-ab-wrap" style="display:none;width:100%;display:flex;">
                    <img src="${base1}_a.jpg${v}" style="flex:1;width:50%;display:block;"
                         onerror="this.src='${base2}_a.jpg${v}'; this.onerror=function(){this.src='${base3}_a.jpg${v}';this.onerror=null;};">
                    <img src="${base1}_b.jpg${v}" style="flex:1;width:50%;display:block;"
                         onerror="this.src='${base2}_b.jpg${v}'; this.onerror=function(){this.src='${base3}_b.jpg${v}';this.onerror=null;};">
                </div>
            </div>
        `;
    }).join('');

    wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ===== 이전/다음 화 =====
window.changeChapter = function (delta) {
    const next = currentChapter + delta;
    if (next < 1 || next > TOTAL_CHAPTERS) return;
    const targetGroup = Math.floor((next - 1) / GROUP_SIZE);
    const sel = document.getElementById('chapter-group-select');
    if (parseInt(sel.value) !== targetGroup) {
        sel.value = targetGroup;
        renderChapterList(targetGroup);
    }
    selectChapter(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// ===================================================================
// ===== 댓글 기능 =====
// ===================================================================

async function loadComments(chapterNum) {
    if (!chapterNum) return;
    try {
        const res = await fetch(`/api/manga/comments?chapter=${chapterNum}`);
        if (!res.ok) return;
        const allComments = await res.json();

        const parentComments = allComments.filter(c => !c.parent_id);
        document.getElementById('manga-comments-count').textContent = parentComments.length;

        const list = document.getElementById('manga-comments-list');
        if (allComments.length === 0) {
            list.innerHTML = `<div style="padding:2rem;text-align:center;color:#888;font-size:0.95rem;background:#fafafa;border-radius:8px;border:1px dashed #eee;">첫 번째 댓글을 남겨보세요!</div>`;
            return;
        }

        let html = '';
        allComments.forEach(c => {
            if (c.parent_id) return;
            html += renderComment(c, allComments);
        });
        list.innerHTML = html;

        // 답글 버튼
        list.querySelectorAll('.manga-reply-btn').forEach(btn => {
            btn.onclick = () => showReplyForm(parseInt(btn.dataset.id), btn.dataset.author);
        });
        // 삭제 버튼
        list.querySelectorAll('.manga-delete-btn').forEach(btn => {
            btn.onclick = () => deleteComment(parseInt(btn.dataset.id));
        });
    } catch (e) {
        console.error('댓글 로드 실패:', e);
    }
}

function renderComment(c, allComments, isReply = false) {
    const date = new Date(c.created_at);
    const dateStr = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')} ${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`;
    const canDelete = currentUser && (c.uid === currentUser.uid || userRole === 'admin');
    const marginLeft = isReply ? 'margin-left:3rem;' : '';
    const avatarSize = isReply ? '32px' : '40px';
    const avatarHTML = c.avatar
        ? `<img src="${c.avatar}" style="width:100%;height:100%;object-fit:cover;">`
        : `<span style="font-size:0.85rem;font-weight:800;">${(c.author||'?')[0].toUpperCase()}</span>`;

    let html = `
        <div style="padding:1.2rem;border:1px solid #f1f1f1;border-radius:8px;background:white;display:flex;gap:1rem;${marginLeft}margin-bottom:0.5rem;">
            <div style="width:${avatarSize};height:${avatarSize};border-radius:50%;background:var(--primary-light);color:var(--primary-color);display:flex;align-items:center;justify-content:center;flex-shrink:0;border:1.5px solid var(--border-color);overflow:hidden;">
                ${avatarHTML}
            </div>
            <div style="flex:1;">
                <div style="display:flex;align-items:center;gap:0.6rem;margin-bottom:0.4rem;">
                    <strong style="font-size:0.9rem;color:#212529;">${escHtml(c.author)}</strong>
                    <span style="font-size:0.75rem;color:#868e96;">${dateStr}</span>
                </div>
                <p style="margin:0 0 0.5rem;font-size:0.9rem;color:#495057;line-height:1.6;white-space:pre-wrap;">${escHtml(c.content)}</p>
                <div style="display:flex;gap:0.5rem;">
                    ${currentUser && !isReply ? `<button class="manga-reply-btn" data-id="${c.id}" data-author="${escHtml(c.author)}" style="background:none;border:none;color:#868e96;cursor:pointer;font-size:0.8rem;font-weight:700;padding:0;">답글</button>` : ''}
                    ${canDelete ? `<button class="manga-delete-btn" data-id="${c.id}" style="background:none;border:none;color:#e03131;cursor:pointer;font-size:0.8rem;font-weight:800;padding:0;">삭제</button>` : ''}
                </div>
            </div>
        </div>
    `;

    // 대댓글
    allComments.filter(r => r.parent_id === c.id).forEach(reply => {
        html += renderComment(reply, allComments, true);
    });
    return html;
}

function updateCommentForm() {
    const wrap = document.getElementById('manga-comment-form-wrap');
    if (!wrap) return;

    if (!currentUser) {
        wrap.innerHTML = `
            <div style="padding:1.5rem;background:#f8f9fa;border:1px solid #e9ecef;border-radius:8px;text-align:center;font-size:0.9rem;color:#495057;">
                댓글은 <a href="auth.html" style="color:var(--primary-color);font-weight:800;text-decoration:underline;">로그인</a> 후 이용하실 수 있습니다.
            </div>`;
        return;
    }

    wrap.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:0.8rem;">
            <textarea id="manga-comment-input" placeholder="이 화에 대한 따뜻한 댓글을 남겨보세요..."
                style="width:100%;min-height:80px;padding:0.8rem;border:1.5px solid #dee2e6;border-radius:8px;font-family:inherit;font-size:0.9rem;resize:vertical;outline:none;transition:border-color 0.2s;"
                onfocus="this.style.borderColor='var(--primary-color)'" onblur="this.style.borderColor='#dee2e6'"></textarea>
            <div style="display:flex;justify-content:flex-end;gap:0.5rem;">
                <button id="manga-comment-submit" style="background:var(--primary-color);color:white;border:none;padding:0.5rem 1.5rem;border-radius:6px;font-weight:800;font-size:0.9rem;cursor:pointer;">등록</button>
            </div>
        </div>`;

    document.getElementById('manga-comment-submit').onclick = submitComment;
}

async function submitComment() {
    if (!currentUser || !currentChapter) return;
    const input = document.getElementById('manga-comment-input');
    const content = input.value.trim();
    if (!content) { alert('댓글 내용을 입력해주세요.'); return; }

    try {
        const res = await fetch('/api/manga/comments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chapter: currentChapter,
                uid: currentUser.uid,
                author: currentUser.displayName || currentUser.email?.split('@')[0] || '익명',
                content,
                parent_id: replyToCommentId || null
            })
        });
        if (!res.ok) throw new Error('댓글 작성 실패');
        input.value = '';
        cancelReply();
        await loadComments(currentChapter);
    } catch (e) {
        alert('댓글 작성 중 오류가 발생했습니다.');
    }
}

function showReplyForm(commentId, authorName) {
    replyToCommentId = commentId;
    const input = document.getElementById('manga-comment-input');
    if (!input) return;
    input.placeholder = `@${authorName}에게 답글 작성...`;
    input.focus();

    const submitBtn = document.getElementById('manga-comment-submit');
    if (submitBtn && !document.getElementById('manga-cancel-reply')) {
        const cancelBtn = document.createElement('button');
        cancelBtn.id = 'manga-cancel-reply';
        cancelBtn.textContent = '답글 취소';
        cancelBtn.style.cssText = 'background:#868e96;color:white;border:none;padding:0.5rem 1rem;border-radius:6px;font-weight:700;font-size:0.9rem;cursor:pointer;';
        cancelBtn.onclick = cancelReply;
        submitBtn.parentElement.insertBefore(cancelBtn, submitBtn);
    }
}

function cancelReply() {
    replyToCommentId = null;
    const input = document.getElementById('manga-comment-input');
    if (input) input.placeholder = '이 화에 대한 따뜻한 댓글을 남겨보세요...';
    document.getElementById('manga-cancel-reply')?.remove();
}

async function deleteComment(commentId) {
    if (!confirm('댓글을 삭제하시겠습니까?')) return;
    try {
        const res = await fetch('/api/manga/comments/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: commentId, uid: currentUser.uid, role: userRole })
        });
        if (!res.ok) throw new Error();
        await loadComments(currentChapter);
    } catch (e) {
        alert('댓글 삭제에 실패했습니다.');
    }
}

function escHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ===== 알림 =====
window.toggleNotificationDropdown = function () {
    const dd = document.getElementById('notification-dropdown');
    if (dd) dd.style.display = dd.style.display === 'block' ? 'none' : 'block';
};
window.markAllAsRead = async function () {
    if (!currentUser) return;
    await fetch('/api/notifications/read-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: currentUser.uid })
    });
};
document.addEventListener('click', e => {
    const bell = document.getElementById('notification-bell');
    const dd = document.getElementById('notification-dropdown');
    if (bell && dd && !bell.contains(e.target)) dd.style.display = 'none';
});

// ===== 시작 =====
(async () => {
    initGroupSelector();
    await loadUploadedChapters();
    renderChapterList(0);

    const params = new URLSearchParams(location.search);
    const ch = parseInt(params.get('chapter'));
    if (ch && ch >= 1 && ch <= TOTAL_CHAPTERS) {
        const g = Math.floor((ch - 1) / GROUP_SIZE);
        document.getElementById('chapter-group-select').value = g;
        renderChapterList(g);
        selectChapter(ch);
    }
})();
