import { CHARACTERS, CATEGORIES } from './data.js';
import { db, auth, getDocSafe } from './firebase-config.js';
import { doc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

let mergedCharacters = []; // [수정] 초기 상태를 빈 배열로 설정하여 정적 데이터(data.js) 노출을 차단합니다.
let recentChangesTimer = null;

onAuthStateChanged(auth, async (user) => {
    const info = document.getElementById('user-info');
    if (!info) return;
    if (user) {
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

        info.innerHTML = `
            ${isAdmin ? `<a href="admin.html" class="nav-link" style="color:white; font-weight:bold; margin-right:1rem; border:1px solid rgba(255,255,255,0.3); padding:0.2rem 0.5rem; border-radius:3px;">관리자 설정</a>` : ''}
            <span style="color:white; font-size:0.75rem; margin-right:0.4rem;">${nickname}님</span>
            <a href="#" class="nav-link" id="logout-btn">로그아웃</a>
        `;
        
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.onclick = (e) => {
                e.preventDefault();
                if (confirm("로그아웃하시습니까?")) {
                    sessionStorage.removeItem(`role_${user.uid}`);
                    signOut(auth).then(() => location.reload());
                }
            };
        }
    } else {
        info.innerHTML = `<a href="auth.html" class="nav-link">로그인</a>`;
    }
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

window.addEventListener('load', initHome);
