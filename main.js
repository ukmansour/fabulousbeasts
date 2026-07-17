import { CHARACTERS, CATEGORIES } from './data.js';
import { db, auth, getDocSafe } from './firebase-config.js';
import { doc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

let mergedCharacters = []; // [수정] 초기 상태를 빈 배열로 설정하여 정적 데이터(data.js) 노출을 차단합니다.
let recentChangesTimer = null;
let currentUser = null;
let userRole = 'guest';
let currentOpenPostId = null;

onAuthStateChanged(auth, async (user) => {
    const info = document.getElementById('user-info');
    if (!info) return;
    if (user) {
        currentUser = user;
        // [신규] 로그인한 유저 정보를 D1에 실시간 동기화 (Auth -> D1)
        try {
            fetch('/api/user/role', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    uid: user.uid,
                    nickname: user.displayName || user.email?.split('@')[0] || "유저",
                    email: user.email || "",
                    role: 'member', // 기존 역할이 있으면 D1에서 무시되거나 UPSERT됨
                    secret: 'SYNC_ONLY' // API에서 특수 처리하거나 무시 가능
                })
            });
        } catch (e) { console.warn("User sync failed:", e); }

        let isAdmin = false;
        
        // [방어 코드] 이름이 없으면 익명 표시
        const nickname = user.displayName || user.email?.split('@')[0] || "익명";
        
        // [어드민 체크 최적화] 마스터 계정은 DB 읽기 없이 즉시 관리자 부여
        const isSupremeAdmin = user.email === "hodu@youshouyan.wiki";
        
        if (isSupremeAdmin) {
            isAdmin = true;
        } else {
            // 일반 사용자는 세션 스토리지를 활용해 반복적인 DB 읽기 방지
            const cachedRole = sessionStorage.getItem(`role_${user.uid}`);
            if (cachedRole) {
                isAdmin = cachedRole === 'admin';
            } else {
                try {
                    const userRef = doc(db, "users", user.uid);
                    const userSnap = await getDocSafe(userRef);
                    if (userSnap.exists()) {
                        const userData = userSnap.data();
                        
                        // [보안] 차단 상태 실시간 확인
                        if (userData.isBanned === true) {
                            alert("⚠️ 차단된 계정입니다. 관리자에게 문의하세요.");
                            signOut(auth);
                            document.body.innerHTML = `<div style="padding:100px; text-align:center; font-family:sans-serif;">
                                <h1 style="font-size:3rem;">🚫</h1>
                                <h2>접속이 차단되었습니다</h2>
                                <p style="color:#666;">해당 계정은 시스템에 의해 이용이 제한되었습니다.</p>
                                <a href="auth.html" style="color:var(--text-link); text-decoration:none; font-weight:bold;">다른 계정으로 로그인</a>
                            </div>`;
                            return;
                        }
                        
                        isAdmin = userData.role === 'admin';
                        sessionStorage.setItem(`role_${user.uid}`, userData.role);
                    }
                } catch (e) { console.error("Firestore role check error:", e); }
            }
        }

        userRole = isAdmin ? 'admin' : 'member';

        info.innerHTML = `
            ${isAdmin ? `<a href="admin.html" class="nav-link" style="color:white; font-weight:bold; margin-right:1rem; border:1px solid rgba(255,255,255,0.3); padding:0.2rem 0.5rem; border-radius:3px;">관리자 설정</a>` : ''}
            <span style="color:white; font-size:0.75rem; margin-right:0.4rem;">${nickname}님</span>
            <a href="#" class="nav-link" id="logout-btn">로그아웃</a>
        `;
        
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.onclick = (e) => {
                e.preventDefault();
                if (confirm("로그아웃하시겠습니까?")) {
                    sessionStorage.removeItem(`role_${user.uid}`);
                    signOut(auth).then(() => location.reload());
                }
            };
        }
    } else {
        currentUser = null;
        userRole = 'guest';
        info.innerHTML = `<a href="auth.html" class="nav-link">로그인</a>`;
    }
    updateCommunityUI();
});

async function initHome() {
    initSearch();
    renderRecentChanges();
    loadSettings(); // [신규] 공지사항 및 소식 불러오기
    
    // [신규] 홈페이지의 하드코딩된 이미지들을 D1에 저장된 최신 편집 사진으로 동기화합니다.
    await syncHomepageImages();
    
    // 30초마다 실시간 동기화 유지
    setInterval(syncHomepageImages, 30000);
}

async function loadSettings() {
    try {
        const res = await fetch('/api/settings');
        if (!res.ok) return;
        const settings = await res.json();
        
        const noticeEl = document.getElementById('home-notice');
        const newsEl = document.getElementById('home-news');
        
        if (noticeEl && settings.notice) {
            noticeEl.innerHTML = settings.notice.replace(/\n/g, '<br>');
        }
        if (newsEl && settings.news) {
            newsEl.innerHTML = settings.news.replace(/\n/g, '<br>');
        }
    } catch (e) {
        console.warn("Failed to load site settings:", e);
    }
}

function parseBirthday(birthdayStr) {
    if (!birthdayStr) return null;
    let match = birthdayStr.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (match) {
        return { month: parseInt(match[2], 10), day: parseInt(match[3], 10) };
    }
    match = birthdayStr.match(/(\d{1,2})[-/.](\d{1,2})/);
    if (match) {
        return { month: parseInt(match[1], 10), day: parseInt(match[2], 10) };
    }
    match = birthdayStr.match(/(\d{1,2})\s*월\s*(\d{1,2})\s*일/);
    if (match) {
        return { month: parseInt(match[1], 10), day: parseInt(match[2], 10) };
    }
    return null;
}

function getNextBirthdayInfo(month, day) {
    const today = new Date();
    const currentYear = today.getFullYear();
    let bday = new Date(currentYear, month - 1, day);
    
    const todayZero = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const bdayZero = new Date(bday.getFullYear(), bday.getMonth(), bday.getDate());
    
    if (bdayZero < todayZero) {
        bday = new Date(currentYear + 1, month - 1, day);
    }
    
    const diffTime = bday.getTime() - todayZero.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return {
        nextDate: bday,
        daysLeft: diffDays,
        isToday: diffDays === 0
    };
}

async function syncHomepageImages() {
    try {
        const response = await fetch('/api/images');
        if (!response.ok) return;
        const images = await response.json();
        
        // 1. mergedCharacters 초기화 및 D1 데이터로만 채우기
        // 이제 정적 파일(data.js)의 데이터는 무시하고 오직 데이터베이스(D1) 정보만 사용합니다.
        mergedCharacters = images.map(item => ({
            id: item.title,
            name: item.name || item.title,
            image: item.image,
            category: item.category || '기타',
            birthday: item.birthday || ''
        }));

        // 1.5 오늘 생일인 캐릭터 배너 노출 처리
        const todayBirthdayBanner = document.getElementById('today-birthday-banner');
        if (todayBirthdayBanner) {
            const todayBornChars = mergedCharacters.filter(c => {
                if (!c.birthday) return false;
                const parsed = parseBirthday(c.birthday);
                if (!parsed) return false;
                const info = getNextBirthdayInfo(parsed.month, parsed.day);
                return info.isToday;
            });

            if (todayBornChars.length > 0) {
                const today = new Date();
                const currentMonth = today.getMonth() + 1;
                const currentDate = today.getDate();
                
                todayBirthdayBanner.innerHTML = todayBornChars.map(c => `
                    <div class="birthday-banner-card">
                        <div class="birthday-avatar-wrap">
                            <img src="${c.image || 'https://via.placeholder.com/150'}" alt="${c.name}" class="birthday-avatar">
                            <span class="birthday-badge">🎂</span>
                        </div>
                        <div style="flex: 1;">
                            <h3 style="margin: 0 0 0.3rem 0; color: #d6336c; font-size: 1.2rem; font-weight: 800;">🎉 오늘(${currentMonth}월 ${currentDate}일)은 ${c.name}의 생일입니다! 🎉</h3>
                            <p style="margin: 0; color: #495057; font-size: 0.9rem;">${c.name}의 생일을 함께 축하해 주세요! 상세 페이지에서 자세한 프로필을 확인해보세요.</p>
                        </div>
                        <a href="detail.html#${encodeURIComponent(c.id)}" class="birthday-btn">축하하러 가기</a>
                    </div>
                `).join('');
                todayBirthdayBanner.style.display = 'block';
            } else {
                todayBirthdayBanner.innerHTML = '';
                todayBirthdayBanner.style.display = 'none';
            }
        }

        // 1.8 다가오는 생일 렌더링
        renderUpcomingBirthdays();

        // 2. 전체 목록(char-grid) 동적 렌더링
        const container = document.getElementById('char-grid');
        if (container) {
            const html = CATEGORIES.map(cat => {
                const catChars = mergedCharacters.filter(c => c.category === cat);
                if (catChars.length === 0) return '';
                
                return `
                    <div class="category-section" style="margin-top:2.5rem;">
                        <h3 class="category-title" style="font-size:1.1rem; border-bottom:1px solid #ddd; padding-bottom:0.3rem; margin-bottom:1rem; font-weight:800;">${cat}</h3>
                        <div class="char-grid-portal">
                            ${catChars.map(c => `
                                <a href="detail.html#${c.id}" class="char-card-mini">
                                    <img src="${c.image || 'https://via.placeholder.com/150'}" alt="${c.name || c.id}">
                                    <span>${c.name || c.id}</span>
                                </a>
                            `).join('')}
                        </div>
                    </div>`;
            }).join('');
            
            container.innerHTML = html || '<div style="padding:50px; text-align:center; color:#999;">데이터베이스에 등록된 캐릭터가 없습니다.</div>';
        }
    } catch (e) {
        console.warn("Homepage dynamic render failed:", e);
        const container = document.getElementById('char-grid');
        if (container) container.innerHTML = '<div style="padding:50px; text-align:center; color:#ff4d4f;">데이터베이스 연결 오류가 발생했습니다.</div>';
    }
}

// [읽기 최적화] Firestore 데이터를 더 이상 사용하지 않으므로 fetchFirestoreData 함수를 제거하거나 빈 상태로 둡니다.
async function fetchFirestoreData() {
    console.log("Firestore migration complete. D1 is now the primary data source.");
}

async function renderRecentChanges() {
    const list = document.getElementById('home-recent-list');
    const listInline = document.getElementById('home-recent-list-inline');
    if (!list && !listInline) return;
    
    try {
        const response = await fetch('/api/recent');
        if (!response.ok) throw new Error('Recent changes fetch failed');
        const results = await response.json();
        
        if (results.length === 0) {
            const empty = '<p style="font-size:0.8rem; color:#999;">문서가 아직 없습니다.</p>';
            if (list) list.innerHTML = empty;
            if (listInline) listInline.innerHTML = empty;
            return;
        }
        
        const html = results.map(d => {
            // [수정] 날짜 파싱 안정화
            let dateStr = '-';
            if (d.updated_at) {
                try {
                    const utcDateStr = d.updated_at.replace(' ', 'T') + (d.updated_at.endsWith('Z') ? '' : 'Z');
                    const dateObj = new Date(utcDateStr);
                    dateStr = dateObj.toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
                } catch(e) { dateStr = d.updated_at; }
            }
            
            return `
                <div class="recent-item" style="margin-bottom:12px; padding-bottom:8px; border-bottom:1px solid #f0f0f0;">
                    <a href="detail.html#${d.title}" class="recent-link" style="font-weight:700; color:var(--text-link); text-decoration:none; font-size:14px;">${d.title}</a>
                    <div class="recent-meta" style="font-size:11px; color:#999; margin-top:2px;">
                        <span>${d.author || '익명'}</span> | <span>${dateStr}</span>
                    </div>
                </div>`;
        }).join('');

        if (list) list.innerHTML = html;
        if (listInline) listInline.innerHTML = html;
    } catch (e) {
        console.error("Recent changes error:", e);
        const err = '<p style="font-size:0.8rem; color:#999;">불러오기 실패</p>';
        if (list) list.innerHTML = err;
        if (listInline) listInline.innerHTML = err;
    }
    
    // 무한 루프 방지: 타이머가 없을 때만 설정
    if (!recentChangesTimer) {
        recentChangesTimer = setInterval(renderRecentChanges, 60000); // 1분으로 주기 연장
    }
}

function renderCategoryGrid() {
    const container = document.getElementById('char-grid');
    if (!container) return;
    container.innerHTML = CATEGORIES.map(cat => {
        const catChars = mergedCharacters.filter(c => c.category === cat);
        if (catChars.length === 0) return '';
        return `
            <div class="category-section" style="margin-top:2.5rem;">
                <h3 class="category-title" style="font-size:1.1rem; border-bottom:1px solid #ddd; padding-bottom:0.3rem; margin-bottom:1rem; font-weight:800;">${cat}</h3>
                <div class="char-grid-portal">
                    ${catChars.map(c => `<a href="detail.html#${c.id}" class="char-card-mini"><img src="${c.image || 'https://via.placeholder.com/150'}" alt="${c.name}"><span>${c.name}</span></a>`).join('')}
                </div>
            </div>`;
    }).join('');
}

async function submitPost() {
    const titleInput = document.getElementById('post-title');
    const contentInput = document.getElementById('post-content');
    if (!titleInput || !contentInput) return;

    const title = titleInput.value.trim();
    const content = contentInput.value.trim();

    if (!title || !content) {
        alert("제목과 내용을 모두 입력해 주세요.");
        return;
    }

    try {
        const res = await fetch('/api/community/posts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                uid: currentUser.uid,
                author: currentUser.displayName || '익명 유저',
                title: title,
                content: content
            })
        });

        if (res.ok) {
            titleInput.value = '';
            contentInput.value = '';
            document.getElementById('post-write-modal').classList.remove('active');
            loadCommunityPosts();
        } else {
            alert("게시글 작성에 실패했습니다.");
        }
    } catch (err) {
        console.error(err);
        alert("게시글 작성 중 오류가 발생했습니다.");
    }
}

function renderUpcomingBirthdays() {
    const container = document.getElementById('home-upcoming-birthdays');
    if (!container) return;

    const bdayChars = mergedCharacters.filter(c => c.birthday);
    if (bdayChars.length === 0) {
        container.innerHTML = `<div style="padding: 1rem; text-align: center; color: #888;">등록된 생일 정보가 없습니다.</div>`;
        return;
    }

    const sorted = bdayChars.map(c => {
        const parsed = parseBirthday(c.birthday);
        if (!parsed) return null;
        const info = getNextBirthdayInfo(parsed.month, parsed.day);
        return { char: c, info };
    }).filter(item => item !== null)
      .sort((a, b) => a.info.daysLeft - b.info.daysLeft)
      .slice(0, 4);

    if (sorted.length === 0) {
        container.innerHTML = `<div style="padding: 1rem; text-align: center; color: #888;">다가오는 생일 정보가 없습니다.</div>`;
        return;
    }

    container.innerHTML = sorted.map(item => {
        const c = item.char;
        const info = item.info;
        const ddayText = info.isToday ? 'D-Day' : `D-${info.daysLeft}`;
        
        return `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 0.2rem; border-bottom: 1px solid #f3f3f5;">
                <a href="detail.html#${encodeURIComponent(c.id)}" style="font-weight: 700; text-decoration: none; color: var(--text-main); display: flex; align-items: center; gap: 0.6rem; font-size: 0.85rem;">
                    <img src="${c.image || 'https://via.placeholder.com/50'}" style="width: 28px; height: 28px; border-radius: 50%; object-fit: cover; border: 1px solid #eee;">
                    <span>${c.name}</span>
                </a>
                <span style="font-weight: 800; color: #d6336c; font-size: 0.75rem; background: #fff0f6; padding: 0.15rem 0.5rem; border-radius: 12px; border: 1px solid #ffc9db; font-family: monospace;">
                    ${ddayText}
                </span>
            </div>
        `;
    }).join('');
}

function updateCommunityUI() {
    const writeBtn = document.getElementById('write-post-btn');
    if (writeBtn) {
        writeBtn.style.display = currentUser ? 'block' : 'none';
    }
    loadCommunityPosts();
}

async function loadCommunityPosts() {
    const listEl = document.getElementById('community-posts-list');
    if (!listEl) return;

    try {
        const res = await fetch('/api/community/posts');
        if (!res.ok) {
            listEl.innerHTML = `<div style="padding: 1.5rem; text-align: center; color: #888;">게시글을 불러올 수 없습니다.</div>`;
            return;
        }
        const posts = await res.json();
        if (posts.length === 0) {
            listEl.innerHTML = `<div style="padding: 2rem; text-align: center; color: #888; font-size: 0.95rem; background: #fafafa; border-radius: 8px; border: 1px dashed #eee;">첫 번째 커뮤니티 글을 남겨보세요!</div>`;
            return;
        }

        listEl.innerHTML = posts.map(p => {
            const date = new Date(p.created_at);
            const dateStr = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
            const snippet = p.content.length > 80 ? p.content.substring(0, 80) + '...' : p.content;
            
            return `
                <div class="community-post-item" data-id="${p.id}" style="padding: 1rem; border: 1.5px solid #f1f3f5; border-radius: 8px; background: white; cursor: pointer; transition: all 0.2s ease;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; margin-bottom: 0.4rem;">
                        <h4 style="margin: 0; font-size: 1rem; font-weight: 800; color: #212529; flex: 1;">
                            ${p.title.replace(/</g, '&lt;').replace(/>/g, '&gt;')}
                            ${p.comment_count > 0 ? `<span style="color: var(--primary-color); font-size: 0.85rem; margin-left: 0.4rem; font-weight: 700;">[${p.comment_count}]</span>` : ''}
                        </h4>
                        <span style="font-size: 0.75rem; color: #868e96; white-space: nowrap;">${dateStr}</span>
                    </div>
                    <p style="margin: 0 0 0.5rem 0; font-size: 0.85rem; color: #495057; line-height: 1.5; white-space: pre-wrap;">${snippet.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 0.8rem; color: #495057; font-weight: 700;">글쓴이: ${p.author}</span>
                        ${currentUser && (p.uid === currentUser.uid || userRole === 'admin') ? `
                            <button class="delete-post-btn" data-id="${p.id}" style="background: none; border: none; color: #e03131; font-weight: 800; font-size: 0.75rem; cursor: pointer; padding: 0.2rem 0.5rem; border-radius: 4px; z-index: 10;">삭제</button>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');

        listEl.querySelectorAll('.community-post-item').forEach(item => {
            const id = item.getAttribute('data-id');
            
            const delBtn = item.querySelector('.delete-post-btn');
            if (delBtn) {
                delBtn.onclick = async (e) => {
                    e.stopPropagation();
                    if (confirm("정말 이 게시글을 삭제하시겠습니까? 관련 댓글도 모두 삭제됩니다.")) {
                        try {
                            const dres = await fetch('/api/community/posts/delete', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ id: parseInt(id, 10), uid: currentUser.uid, role: userRole })
                            });
                            if (dres.ok) {
                                loadCommunityPosts();
                            } else {
                                alert("삭제 실패했습니다.");
                            }
                        } catch (err) {
                            console.error(err);
                        }
                    }
                };
            }

            item.onclick = () => {
                openPostDetail(parseInt(id, 10));
            };
        });

    } catch (err) {
        console.error(err);
        listEl.innerHTML = `<div style="padding: 1.5rem; text-align: center; color: #888;">오류가 발생했습니다.</div>`;
    }
}

async function openPostDetail(postId) {
    currentOpenPostId = postId;
    const modal = document.getElementById('post-detail-modal');
    if (!modal) return;

    modal.classList.add('active');

    try {
        const res = await fetch('/api/community/posts');
        if (res.ok) {
            const posts = await res.json();
            const post = posts.find(p => p.id === postId);
            if (!post) {
                alert("게시글을 찾을 수 없습니다.");
                modal.classList.remove('active');
                return;
            }

            const date = new Date(post.created_at);
            const dateStr = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

            document.getElementById('post-detail-content-wrap').innerHTML = `
                <h2 style="font-size: 1.35rem; font-weight: 800; color: #212529; margin: 0.5rem 0 0.8rem 0; border: none; line-height: 1.4;">
                    ${post.title.replace(/</g, '&lt;').replace(/>/g, '&gt;')}
                </h2>
                <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: #868e96; margin-bottom: 1.2rem; background: #f8f9fa; padding: 0.6rem 0.8rem; border-radius: 6px;">
                    <span>작성자: <strong>${post.author}</strong></span>
                    <span>${dateStr}</span>
                </div>
                <div style="font-size: 0.95rem; color: #343a40; line-height: 1.7; white-space: pre-wrap; word-break: break-all;">
                    ${post.content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}
                </div>
            `;

            const formWrap = document.getElementById('post-comment-form-wrap');
            if (currentUser) {
                formWrap.innerHTML = `
                    <div style="display: flex; flex-direction: column; gap: 0.6rem;">
                        <textarea id="post-comment-input" placeholder="따뜻한 댓글을 남겨보세요..." style="width: 100%; min-height: 60px; padding: 0.6rem; border: 1.5px solid #dee2e6; border-radius: 6px; font-family: inherit; font-size: 0.85rem; resize: vertical; outline: none;"></textarea>
                        <div style="display: flex; justify-content: flex-end;">
                            <button id="submit-post-comment-btn" style="background: var(--primary-color); color: white; border: none; padding: 0.4rem 1.2rem; border-radius: 6px; font-weight: 800; font-size: 0.8rem; cursor: pointer;">등록</button>
                        </div>
                    </div>
                `;
                
                document.getElementById('submit-post-comment-btn').onclick = async () => {
                    const commentInput = document.getElementById('post-comment-input');
                    const content = commentInput.value.trim();
                    if (!content) {
                        alert("댓글 내용을 입력해 주세요.");
                        return;
                    }

                    try {
                        const cres = await fetch('/api/community/comments', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                post_id: postId,
                                uid: currentUser.uid,
                                author: currentUser.displayName || '익명 유저',
                                content: content
                            })
                        });

                        if (cres.ok) {
                            commentInput.value = '';
                            loadPostComments(postId);
                            loadCommunityPosts();
                        } else {
                            alert("댓글 작성에 실패했습니다.");
                        }
                    } catch (err) {
                        console.error(err);
                    }
                };
            } else {
                formWrap.innerHTML = `
                    <div style="padding: 1rem; background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 6px; text-align: center; font-size: 0.85rem; color: #495057;">
                        댓글은 로그인 후 작성할 수 있습니다.
                    </div>
                `;
            }

            loadPostComments(postId);
        }
    } catch (err) {
        console.error(err);
    }
}

async function loadPostComments(postId) {
    const listEl = document.getElementById('post-comments-list');
    const countEl = document.getElementById('post-comments-count');
    if (!listEl) return;

    try {
        const res = await fetch(`/api/community/comments?post_id=${postId}`);
        if (res.ok) {
            const comments = await res.json();
            countEl.textContent = comments.length;

            if (comments.length === 0) {
                listEl.innerHTML = `<div style="padding: 1.5rem; text-align: center; color: #888; font-size: 0.85rem;">작성된 댓글이 없습니다.</div>`;
                return;
            }

            listEl.innerHTML = comments.map(c => {
                const date = new Date(c.created_at);
                const dateStr = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
                const canDelete = currentUser && (c.uid === currentUser.uid || userRole === 'admin');

                return `
                    <div class="post-comment-item" style="padding: 0.8rem; border: 1px solid #f1f3f5; border-radius: 6px; background: #fafafa; display: flex; justify-content: space-between; gap: 1rem;">
                        <div style="flex: 1;">
                            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.3rem;">
                                <strong style="font-size: 0.85rem; color: #212529;">${c.author}</strong>
                                <span style="font-size: 0.7rem; color: #868e96;">${dateStr}</span>
                            </div>
                            <p style="margin: 0; font-size: 0.85rem; color: #495057; line-height: 1.4; white-space: pre-wrap;">${c.content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
                        </div>
                        ${canDelete ? `
                            <button class="delete-post-comment-btn" data-id="${c.id}" style="background: none; border: none; color: #e03131; font-weight: 800; font-size: 0.75rem; cursor: pointer; padding: 0.2rem; align-self: flex-start;">삭제</button>
                        ` : ''}
                    </div>
                `;
            }).join('');

            listEl.querySelectorAll('.delete-post-comment-btn').forEach(btn => {
                btn.onclick = async () => {
                    const id = btn.getAttribute('data-id');
                    if (confirm("정말 이 댓글을 삭제하시겠습니까?")) {
                        try {
                            const dres = await fetch('/api/community/comments/delete', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ id: parseInt(id, 10), uid: currentUser.uid, role: userRole })
                            });
                            if (dres.ok) {
                                loadPostComments(postId);
                                loadCommunityPosts();
                            } else {
                                alert("삭제 실패했습니다.");
                            }
                        } catch (err) {
                            console.error(err);
                        }
                    }
                };
            });
        }
    } catch (err) {
        console.error(err);
    }
}

function initCommunityEvents() {
    const writeBtn = document.getElementById('write-post-btn');
    const writeModal = document.getElementById('post-write-modal');
    const writeClose = document.getElementById('post-write-close');
    const cancelPostBtn = document.getElementById('cancel-post-btn');
    const submitPostBtn = document.getElementById('submit-post-btn');

    if (writeBtn && writeModal) {
        writeBtn.onclick = () => writeModal.classList.add('active');
    }
    if (writeClose && writeModal) {
        writeClose.onclick = () => writeModal.classList.remove('active');
    }
    if (cancelPostBtn && writeModal) {
        cancelPostBtn.onclick = () => writeModal.classList.remove('active');
    }
    if (submitPostBtn) {
        submitPostBtn.onclick = submitPost;
    }

    const detailModal = document.getElementById('post-detail-modal');
    const detailClose = document.getElementById('post-detail-close');
    if (detailClose && detailModal) {
        detailClose.onclick = () => {
            detailModal.classList.remove('active');
            currentOpenPostId = null;
        };
    }
}

function initSearch() {
    const input = document.getElementById('global-search');
    const results = document.getElementById('search-results');
    if (!input) return;
    input.oninput = () => {
        const val = input.value.trim().toLowerCase();
        if (val.length < 1) { results.classList.remove('active'); return; }
        const matches = mergedCharacters.filter(c => (c.name||'').toLowerCase().includes(val) || c.id.toLowerCase().includes(val)).slice(0, 10);
        results.innerHTML = matches.length > 0 
            ? matches.map(m => `<a href="detail.html#${m.id}" class="search-item" style="display:block; text-decoration:none; color:inherit;"><strong>${m.name || m.id}</strong></a>`).join('')
            : `<a href="edit.html#${val}" class="search-item" style="display:block; text-decoration:none; color:inherit;">"${val}" 문서 만들기</a>`;
        results.classList.add('active');
    };
    document.addEventListener('click', (e) => { if(!input.contains(e.target)) results.classList.remove('active'); });
}

window.addEventListener('load', () => {
    initHome();
    initCommunityEvents();
});
