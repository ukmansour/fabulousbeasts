import { CHARACTERS, CATEGORIES } from './data.js';
import { db, auth, getDocSafe } from './firebase-config.js';
import { doc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

let mergedCharacters = [...CHARACTERS];
let recentChangesTimer = null;

onAuthStateChanged(auth, async (user) => {
    const info = document.getElementById('user-info');
    if (!info) return;
    if (user) {
        let isAdmin = false;
        
        // [읽기 최적화] 기본적으로 Auth의 displayName 사용
        const nickname = user.displayName || user.email?.split('@')[0] || "유저";
        
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
                        if (userData.role === 'banned') {
                            alert("⚠️ 귀하의 계정은 차단되었습니다.");
                            document.body.innerHTML = `<div style="padding:100px; text-align:center;"><h1>🚫 차단된 계정입니다.</h1></div>`;
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
    // [읽기 최적화] 모든 캐릭터 데이터가 index.html에 하드코딩되어 있으므로 renderCategoryGrid()를 호출하지 않습니다.
    // renderCategoryGrid(); 
    initSearch();
    
    // 2. [읽기 최적화] 홈 화면 진입 시 Firestore 캐릭터 전체 읽기(getDocs)를 중단합니다.
    // 사용자가 명시적으로 검색하거나 상세 페이지에 들어갈 때만 개별 데이터를 읽도록 유도합니다.
    // await fetchFirestoreData(); 
    
    // 3. 최신 변경 내역 로드 (최소한의 읽기)
    renderRecentChanges();
    // loadNotice(); // [읽기 최적화] 공지/소식은 이제 HTML에서 정적으로 관리합니다.
}

// [읽기 최적화] Firestore 데이터를 더 이상 사용하지 않으므로 fetchFirestoreData 함수를 제거하거나 빈 상태로 둡니다.
async function fetchFirestoreData() {
    console.log("Firestore migration complete. D1 is now the primary data source.");
}

async function renderRecentChanges() {
    const list = document.getElementById('home-recent-list');
    if (!list) return;
    
    try {
        const response = await fetch('/recent');
        if (!response.ok) throw new Error('Recent changes fetch failed');
        const results = await response.json();
        
        if (results.length === 0) {
            list.innerHTML = '<p style="font-size:0.8rem; color:#999;">문서가 아직 없습니다.</p>';
            return;
        }
        
        list.innerHTML = results.map(d => {
            const dateStr = d.updated_at ? new Date(d.updated_at).toLocaleString('ko-KR') : '-';
            return `
                <div class="recent-item" style="margin-bottom:12px; padding-bottom:8px; border-bottom:1px solid #f0f0f0;">
                    <a href="detail.html#${d.title}" class="recent-link" style="font-weight:700; color:var(--text-link); text-decoration:none; font-size:14px;">${d.title}</a>
                    <div class="recent-meta" style="font-size:11px; color:#999; margin-top:2px;">
                        <span>${d.author || '익명'}</span> | <span>${dateStr}</span>
                    </div>
                </div>`;
        }).join('');
    } catch (e) {
        console.error("Recent changes error:", e);
        list.innerHTML = '<p style="font-size:0.8rem; color:#999;">불러오기 실패</p>';
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
            ? matches.map(m => `<div class="search-item" onclick="location.href='detail.html#${m.id}'"><strong>${m.name || m.id}</strong></div>`).join('')
            : `<div class="search-item" onclick="location.href='edit.html#${val}'">"${val}" 문서 만들기</div>`;
        results.classList.add('active');
    };
    document.addEventListener('click', (e) => { if(!input.contains(e.target)) results.classList.remove('active'); });
}

window.addEventListener('load', initHome);
