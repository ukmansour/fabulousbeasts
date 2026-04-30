import { CHARACTERS, CATEGORIES } from './data.js';
import { db, auth } from './firebase-config.js';
import { collection, getDocs, orderBy, query, limit, doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
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
                isAdmin = userSnap.data().role === 'admin';
            } else {
                // [자동 초기화] Auth에는 있지만 Firestore에 문서가 없는 경우 생성
                console.log("Initializing Firestore document for existing Auth user:", user.uid);
                const newUserData = {
                    uid: user.uid,
                    nickname: user.displayName || "가입한 유저",
                    role: 'member',
                    joinedAt: serverTimestamp(),
                    contributionCount: 0
                };
                await setDoc(userRef, newUserData);
                isAdmin = false;
            }
        } catch (e) { console.error("Error fetching/initializing role:", e); }

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
        const q = query(collection(db, "characters"), orderBy("updatedAt", "desc"), limit(12));
        const snap = await getDocs(q);
        if (snap.empty) {
            list.innerHTML = '<p style="font-size:0.8rem; color:#999;">변경 내역이 없습니다.</p>';
            return;
        }
        list.innerHTML = snap.docs.map(doc => {
            const d = doc.data();
            const date = d.updatedAt?.seconds ? new Date(d.updatedAt.seconds * 1000) : new Date(d.updatedAt);
            return `
                <div class="recent-item">
                    <a href="detail.html#${doc.id}" class="recent-link">${d.name || doc.id}</a>
                    <div class="recent-meta">
                        <span>${d.updatedBy || '익명'}</span>
                        <span>${isNaN(date) ? '최근' : date.toLocaleDateString()}</span>
                    </div>
                </div>`;
        }).join('');
    } catch (e) { 
        console.error(e);
        list.innerHTML = '<p style="font-size:0.8rem; color:#999;">변경 내역을 불러올 수 없습니다.</p>'; 
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
            ? matches.map(m => `<div class="search-item" onclick="location.href='detail.html#${m.id}'"><strong>${m.name||m.id}</strong></div>`).join('')
            : `<div class="search-item" onclick="location.href='edit.html#${val}'">"${val}" 문서 만들기</div>`;
        results.classList.add('active');
    };
    document.addEventListener('click', (e) => { if(!input.contains(e.target)) results.classList.remove('active'); });
}

window.addEventListener('load', initHome);
