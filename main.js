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
    // 로딩 표시
    showLoadingIndicator();
    
    try {
        // [중요] D1 데이터 먼저 로드 - await로 완료될 때까지 대기
        await syncHomepageImages();
        
        // D1 데이터 로드 완료 후 나머지 초기화
        initSearch();
        renderRecentChanges();
        loadSettings(); // 공지사항 및 소식 불러오기
        
        // 30초마다 실시간 동기화 유지
        setInterval(syncHomepageImages, 30000);
        
    } catch (error) {
        console.error('초기화 실패:', error);
        showErrorMessage();
    } finally {
        hideLoadingIndicator();
    }
}

function showLoadingIndicator() {
    const container = document.getElementById('char-grid');
    if (container) {
        container.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4rem 2rem; gap: 1rem;">
                <div style="width: 50px; height: 50px; border: 4px solid #f3f3f3; border-top: 4px solid var(--primary-color); border-radius: 50%; animation: spin 1s linear infinite;"></div>
                <p style="color: #666; font-size: 0.95rem;">캐릭터 정보를 불러오는 중...</p>
            </div>
            <style>
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            </style>
        `;
    }
}

function hideLoadingIndicator() {
    // 로딩 인디케이터는 syncHomepageImages()에서 실제 컨텐츠로 교체됨
}

function showErrorMessage() {
    const container = document.getElementById('char-grid');
    if (container) {
        container.innerHTML = `
            <div style="padding: 4rem 2rem; text-align: center;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
                <h3 style="color: #ff4d4f; margin-bottom: 0.5rem;">데이터를 불러올 수 없습니다</h3>
                <p style="color: #666; margin-bottom: 1.5rem;">서버 연결에 문제가 있습니다. 잠시 후 다시 시도해 주세요.</p>
                <button onclick="location.reload()" style="padding: 0.8rem 2rem; background: var(--primary-color); color: white; border: none; border-radius: 6px; font-weight: 700; cursor: pointer;">
                    새로고침
                </button>
            </div>
        `;
    }
}

async function loadSettings() {
    try {
        const res = await fetch('/api/settings');
        if (!res.ok) return;
        const settings = await res.json();
        
        const noticeEl = document.getElementById('home-notice');
        const newsEl = document.getElementById('home-news');
        const topAnnouncementBanner = document.getElementById('top-announcement-banner');
        const topAnnouncementContent = document.getElementById('top-announcement-content');
        
        // 사이드바 공지
        if (noticeEl && settings.notice) {
            noticeEl.innerHTML = settings.notice.replace(/\n/g, '<br>');
        }
        
        // 최근 소식
        if (newsEl && settings.news) {
            newsEl.innerHTML = settings.news.replace(/\n/g, '<br>');
        }
        
        // 헤더 바로 아래 공지 배너 (좁은 형태)
        if (topAnnouncementBanner && topAnnouncementContent && settings.notice) {
            // 줄바꿈을 공백으로 변경하여 한 줄로 표시
            topAnnouncementContent.innerHTML = settings.notice.replace(/\n/g, ' ');
            topAnnouncementBanner.style.display = 'block';
        } else if (topAnnouncementBanner && !settings.notice) {
            topAnnouncementBanner.style.display = 'none';
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
    console.log('[syncHomepageImages] 시작');
    try {
        const response = await fetch('/api/images');
        console.log('[syncHomepageImages] API 응답 상태:', response.status);
        
        if (!response.ok) {
            throw new Error(`API 응답 실패: ${response.status}`);
        }
        
        const images = await response.json();
        console.log('[syncHomepageImages] 받은 데이터 개수:', images.length);
        
        // 1. mergedCharacters 초기화 및 D1 데이터로만 채우기
        // 이제 정적 파일(data.js)의 데이터는 무시하고 오직 데이터베이스(D1) 정보만 사용합니다.
        mergedCharacters = images.map(item => ({
            id: item.title,
            name: item.name || item.title,
            image: item.image,
            category: item.category || '기타',
            birthday: item.birthday || ''
        }));
        
        console.log('[syncHomepageImages] mergedCharacters 개수:', mergedCharacters.length);

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
                        </div>
                        <div style="flex: 1;">
                            <h3 style="margin: 0 0 0.3rem 0; color: #d6336c; font-size: 1.2rem; font-weight: 800;">오늘(${currentMonth}월 ${currentDate}일)은 ${c.name}의 생일입니다!</h3>
                            <p style="margin: 0; color: #495057; font-size: 0.9rem;">${c.name}의 생일을 함께 축하해 주세요!</p>
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
            console.log('[syncHomepageImages] 렌더링 완료');
        }
    } catch (e) {
        console.error("[syncHomepageImages] 오류 발생:", e);
        const container = document.getElementById('char-grid');
        if (container) {
            container.innerHTML = `
                <div style="padding: 4rem 2rem; text-align: center;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
                    <h3 style="color: #ff4d4f; margin-bottom: 0.5rem;">데이터를 불러올 수 없습니다</h3>
                    <p style="color: #666; margin-bottom: 0.5rem;">서버 연결에 문제가 있습니다.</p>
                    <p style="color: #999; font-size: 0.85rem; margin-bottom: 1.5rem;">에러: ${e.message}</p>
                    <button onclick="location.reload()" style="padding: 0.8rem 2rem; background: var(--primary-color); color: white; border: none; border-radius: 6px; font-weight: 700; cursor: pointer;">
                        새로고침
                    </button>
                </div>
            `;
        }
        throw e; // 상위로 에러 전달
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

function renderUpcomingBirthdays() {
    const container = document.getElementById('home-upcoming-birthdays');
    if (!container) return;

    const bdayChars = mergedCharacters.filter(c => c.birthday);
    if (bdayChars.length === 0) {
        container.innerHTML = `<div style="padding: 1rem; text-align: center; color: #888;">등록된 생일 정보가 없습니다.</div>`;
        return;
    }

    // 가장 가까운 3명의 생일을 가져옵니다
    const closestThree = bdayChars.map(c => {
        const parsed = parseBirthday(c.birthday);
        if (!parsed) return null;
        const info = getNextBirthdayInfo(parsed.month, parsed.day);
        return { char: c, info };
    }).filter(item => item !== null)
      .sort((a, b) => a.info.daysLeft - b.info.daysLeft)
      .slice(0, 3); // 최대 3명

    if (closestThree.length === 0) {
        container.innerHTML = `<div style="padding: 1rem; text-align: center; color: #888;">다가오는 생일 정보가 없습니다.</div>`;
        return;
    }

    container.innerHTML = closestThree.map(item => {
        const c = item.char;
        const info = item.info;
        const ddayText = info.isToday ? 'D-Day' : `D-${info.daysLeft}`;
        const nextDateStr = `${info.nextDate.getMonth() + 1}월 ${info.nextDate.getDate()}일`;

        return `
            <a href="detail.html#${encodeURIComponent(c.id)}" style="display: flex; align-items: center; gap: 0.8rem; text-decoration: none; color: inherit; padding: 0.3rem 0; margin-bottom: 0.5rem;">
                <img src="${c.image || 'https://via.placeholder.com/50'}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid #ffc9db;">
                <div style="flex: 1;">
                    <div style="font-weight: 800; font-size: 0.9rem; color: var(--text-main);">${c.name}</div>
                    <div style="font-size: 0.75rem; color: #868e96;">${nextDateStr}</div>
                </div>
                <span style="font-weight: 800; color: #d6336c; font-size: 0.8rem; background: #fff0f6; padding: 0.2rem 0.6rem; border-radius: 12px; border: 1px solid #ffc9db; font-family: monospace;">
                    ${ddayText}
                </span>
            </a>
        `;
    }).join('');
}

function updateCommunityUI() {
    const writeBtn = document.getElementById('write-post-btn');
    if (writeBtn) {
        writeBtn.style.display = currentUser ? 'block' : 'none';
        // 글쓰기 버튼 클릭 시 community.html로 이동
        writeBtn.onclick = () => {
            window.location.href = 'community.html';
        };
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

        // 홈에서는 최신 5개만 표시
        const displayPosts = posts.slice(0, 5);

        // 테이블 헤더
        let tableHTML = `<div style="display: flex; padding: 0.5rem 1rem; background: #f8f9fa; border-bottom: 1px solid #eee; font-size: 0.75rem; font-weight: 800; color: #868e96;">
            <span style="width: 50px; text-align: center;">번호</span>
            <span style="flex: 1; padding-left: 0.5rem;">제목</span>
            <span style="width: 70px; text-align: center;">작성자</span>
            <span style="width: 80px; text-align: center;">날짜</span>
        </div>`;

        tableHTML += displayPosts.map(p => {
            const date = new Date(p.created_at);
            const dateStr = `${String(date.getMonth()+1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            
            return `
                <div class="community-post-item" data-id="${p.id}" style="display: flex; align-items: center; padding: 0.55rem 1rem; border-bottom: 1px solid #f3f3f5; cursor: pointer; font-size: 0.85rem; transition: background 0.15s;">
                    <span style="width: 50px; text-align: center; color: #868e96; font-size: 0.8rem;">${p.id}</span>
                    <span style="flex: 1; padding-left: 0.5rem; font-weight: 700; color: #212529; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        ${p.title.replace(/</g, '&lt;').replace(/>/g, '&gt;')}
                        ${p.comment_count > 0 ? `<span style="color: var(--primary-color); font-size: 0.8rem; margin-left: 0.3rem;">[${p.comment_count}]</span>` : ''}
                    </span>
                    <span style="width: 70px; text-align: center; color: #495057; font-size: 0.8rem;">${p.author}</span>
                    <span style="width: 80px; text-align: center; color: #868e96; font-size: 0.75rem;">${dateStr}</span>
                </div>
            `;
        }).join('');

        listEl.innerHTML = tableHTML;

        // 게시글 클릭 시 post.html로 이동
        listEl.querySelectorAll('.community-post-item').forEach(item => {
            const id = item.getAttribute('data-id');
            item.onclick = () => {
                window.location.href = `/post.html?id=${id}`;
            };
        });

    } catch (err) {
        console.error(err);
        listEl.innerHTML = `<div style="padding: 1.5rem; text-align: center; color: #888;">오류가 발생했습니다.</div>`;
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
});
