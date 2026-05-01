import { CHARACTERS, CATEGORIES } from './data.js';
import { db, auth } from './firebase-config.js';
import { collection, getDocs, doc, getDoc, setDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

let mergedCharacters = [...CHARACTERS];

onAuthStateChanged(auth, async (user) => {
    const info = document.getElementById('user-info');
    if (!info) return;
    if (user) {
        let isAdmin = false;
        try {
            const userRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userRef);
            
            if (userSnap.exists()) {
                const userData = userSnap.data();
                isAdmin = userData.role === 'admin';
                // [이메일 정보 업데이트] 이메일이 기록되지 않은 경우를 대비
                if (!userData.email && user.email) {
                    await updateDoc(userRef, { email: user.email });
                }
            } else {
                // [가입 즉시 등록 로직] 문서가 없으면 그 즉시 생성 (0.1초 지연도 허용 안함)
                console.log("Creating missing user document for:", user.uid);
                const isSupremeAdmin = user.email === "ukmansour@youshouyan.wiki"; 
                
                const newUserData = {
                    uid: user.uid,
                    nickname: user.displayName || "새 회원",
                    email: user.email || "",
                    role: isSupremeAdmin ? 'admin' : 'member',
                    joinedAt: serverTimestamp(),
                    contributionCount: 0
                };
                await setDoc(userRef, newUserData);
                isAdmin = isSupremeAdmin;
                console.log("User document created successfully.");
            }
        } catch (e) { 
            console.error("User sync failed:", e); 
            // 마스터 계정은 DB 오류 시에도 관리자 권한 허용
            if (user.email === "ukmansour@youshouyan.wiki") isAdmin = true;
        }

        info.innerHTML = `
            ${isAdmin ? `<a href="admin.html" class="nav-link" style="color:white; font-weight:bold; margin-right:1rem; border:1px solid rgba(255,255,255,0.3); padding:0.2rem 0.5rem; border-radius:3px;">관리자 설정</a>` : ''}
            <span style="color:white; font-size:0.75rem; margin-right:0.4rem;">${user.displayName || '유저'}님</span>
            <a href="#" class="nav-link" id="logout-btn">로그아웃</a>
        `;
        
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.onclick = (e) => {
                e.preventDefault();
                if (confirm("로그아웃하시겠습니까?")) signOut(auth).then(() => location.reload());
            };
        }
    } else {
        info.innerHTML = `<a href="auth.html" class="nav-link">로그인</a>`;
    }
});

async function initHome() {
    // 1. 먼저 기본 데이터로 렌더링 (즉각적인 반응성)
    renderFeatured();
    renderCategoryGrid();
    initSearch();
    
    // 2. 비동기로 클라우드 데이터 가져와서 업데이트
    await fetchFirestoreData();
    
    // 3. 업데이트된 데이터로 다시 렌더링
    renderFeatured();
    renderCategoryGrid();
    renderRecentChanges();
    loadNotice();
}

async function fetchFirestoreData() {
    try {
        const snap = await getDocs(collection(db, "characters"));
        const firestoreChars = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        firestoreChars.forEach(fChar => {
            const idx = mergedCharacters.findIndex(c => c.id === fChar.id);
            if (idx !== -1) {
                mergedCharacters[idx] = { ...mergedCharacters[idx], ...fChar };
            } else {
                mergedCharacters.push(fChar);
            }
        });
        console.log("Firestore data merged successfully");
    } catch (e) { 
        console.error("Cloud data load failed:", e); 
    }
}

async function loadNotice() {
    const el = document.getElementById('notice-display');
    if (!el) return;
    try {
        const snap = await getDoc(doc(db, "notices", "main"));
        if (snap.exists() && snap.data().content) {
            el.textContent = snap.data().content;
            el.style.color = '#333';
        }
    } catch (e) {
        console.error("Notice load error:", e);
    }
}

function renderFeatured() {
    const container = document.getElementById('featured-characters-grid');
    if (!container) return;
    const ids = ['tianlu', 'pixiu', 'sibuxiang', 'tony'];
    const featured = mergedCharacters.filter(c => ids.includes(c.id));
    container.innerHTML = featured.map(c => `
        <a href="detail.html#${c.id}" class="char-card-mini">
            <img src="${c.image || 'https://via.placeholder.com/150'}" alt="${c.name}">
            <span>${c.name}</span>
        </a>`).join('');
}

async function renderRecentChanges() {
    const list = document.getElementById('home-recent-list');
    if (!list) return;
    
    try {
        // 인덱스 없이 전체 가져온 뒤 클라이언트에서 정렬
        const snap = await getDocs(collection(db, "characters"));
        
        if (snap.empty) {
            list.innerHTML = '<p style="font-size:0.8rem; color:#999;">문서가 아직 없습니다.</p>';
            return;
        }
        
        const sorted = snap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .sort((a, b) => {
                const ta = a.updatedAt?.seconds ?? 0;
                const tb = b.updatedAt?.seconds ?? 0;
                return tb - ta;
            })
            .slice(0, 12);
        
        list.innerHTML = sorted.map(d => {
            let dateStr = '기록 없음';
            if (d.updatedAt?.seconds) {
                dateStr = new Date(d.updatedAt.seconds * 1000).toLocaleDateString('ko-KR');
            }
            return `
                <div class="recent-item">
                    <a href="detail.html#${d.id}" class="recent-link">${d.name || d.id}</a>
                    <div class="recent-meta">
                        <span>${d.updatedBy || '익명'}</span>
                        <span>${dateStr}</span>
                    </div>
                </div>`;
        }).join('');
    } catch (e) {
        console.error("Recent changes error:", e);
        list.innerHTML = '<p style="font-size:0.8rem; color:#999;">불러오기 실패</p>';
    }
    
    // 30초마다 자동 갱신
    setTimeout(renderRecentChanges, 30000);
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
            ? matches.map(m => `<div class="search-item" onclick="location.href='detail.html#${m.id}'"><strong>${m.name||m.id}</strong></div>`).join('')
            : `<div class="search-item" onclick="location.href='edit.html#${val}'">"${val}" 문서 만들기</div>`;
        results.classList.add('active');
    };
    document.addEventListener('click', (e) => { if(!input.contains(e.target)) results.classList.remove('active'); });
}

window.addEventListener('load', initHome);
