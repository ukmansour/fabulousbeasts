import { CHARACTERS, CATEGORIES } from './data.js';
import { db, auth } from './firebase-config.js';
import { collection, getDocs, orderBy, query, limit } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// 유저 상태 관리
onAuthStateChanged(auth, (user) => {
    const userInfo = document.getElementById('user-info');
    if (!userInfo) return;
    if (user) {
        userInfo.innerHTML = `<span style="color:white; font-size:0.8rem; margin-right:0.5rem;">${user.displayName || '유저'}님</span>
                              <a href="#" class="nav-link" id="logout-btn">로그아웃</a>`;
        document.getElementById('logout-btn').onclick = (e) => {
            e.preventDefault();
            if (confirm("로그아웃하시겠습니까?")) signOut(auth).then(() => location.reload());
        };
    } else {
        userInfo.innerHTML = `<a href="auth.html" class="nav-link">로그인</a>`;
    }
});

async function initHome() {
    renderFeatured();
    renderRecentChanges();
    initSearch();
    renderCategoryGrid();
}

function renderFeatured() {
    const container = document.getElementById('featured-characters-grid');
    if (!container) return;
    
    // 주요 캐릭터 (천록, 벽사, 사불상, 토야)
    const featuredIds = ['tianlu', 'pixiu', 'sibuxiang', 'tony'];
    const featured = CHARACTERS.filter(c => featuredIds.includes(c.id));
    
    container.innerHTML = featured.map(c => `
        <a href="detail.html#${c.id}" class="char-card-small">
            <img src="${c.image}" class="char-card-img" alt="${c.name}">
            <div class="char-card-name">${c.name}</div>
        </a>
    `).join('');
}

async function renderRecentChanges() {
    const list = document.getElementById('home-recent-list');
    if (!list) return;

    try {
        const q = query(collection(db, "characters"), orderBy("updatedAt", "desc"), limit(15));
        const snap = await getDocs(q);
        list.innerHTML = snap.docs.map(doc => {
            const data = doc.data();
            return `
                <div class="recent-item">
                    <a href="detail.html#${doc.id}" class="recent-link">${data.name}</a>
                    <div class="recent-meta">
                        <span>${data.updatedBy || '익명'}</span>
                        <span>${new Date(data.updatedAt?.seconds * 1000 || data.updatedAt).toLocaleDateString()}</span>
                    </div>
                </div>
            `;
        }).join('');
    } catch (e) { console.error(e); }
}

function renderCategoryGrid() {
    const container = document.getElementById('char-grid');
    if (!container) return;

    container.innerHTML = CATEGORIES.map(cat => {
        const catChars = CHARACTERS.filter(c => c.category === cat);
        if (catChars.length === 0) return '';
        return `
            <div class="category-section" style="margin-top:2rem;">
                <h3 class="category-title">${cat}</h3>
                <div class="char-grid-home">
                    ${catChars.map(c => `
                        <a href="detail.html#${c.id}" class="char-card-small">
                            <img src="${c.image}" class="char-card-img" alt="${c.name}">
                            <div class="char-card-name">${c.name}</div>
                        </a>
                    `).join('')}
                </div>
            </div>
        `;
    }).join('');
}

function initSearch() {
    const input = document.getElementById('global-search');
    const results = document.getElementById('search-results');
    if (!input) return;

    input.oninput = () => {
        const val = input.value.trim().toLowerCase();
        if (val.length < 1) { results.classList.remove('active'); return; }
        
        const matches = CHARACTERS.filter(c => c.name.toLowerCase().includes(val) || c.id.toLowerCase().includes(val)).slice(0, 10);
        results.innerHTML = matches.length > 0 
            ? matches.map(m => `<div class="search-item" onclick="location.href='detail.html#${m.id}'">${m.name} (${m.category})</div>`).join('')
            : `<div class="search-item">검색 결과가 없습니다.</div>`;
        results.classList.add('active');
    };
}

window.addEventListener('load', initHome);
