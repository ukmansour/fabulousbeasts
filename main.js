import { CHARACTERS, CATEGORIES } from './data.js';
import { db, auth } from './firebase-config.js';
import { collection, getDocs, orderBy, query, limit } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

onAuthStateChanged(auth, (user) => {
    const info = document.getElementById('user-info');
    if (!info) return;
    if (user) {
        info.innerHTML = `<span style="color:white; font-size:0.75rem; margin-right:0.4rem;">${user.displayName || '유저'}님</span>
                          <a href="#" class="nav-link" id="logout-btn">로그아웃</a>`;
        document.getElementById('logout-btn').onclick = (e) => {
            e.preventDefault();
            if (confirm("로그아웃하시겠습니까?")) signOut(auth).then(() => location.reload());
        };
    } else {
        info.innerHTML = `<a href="auth.html" class="nav-link">로그인</a>`;
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
    const ids = ['tianlu', 'pixiu', 'sibuxiang', 'tony'];
    const featured = CHARACTERS.filter(c => ids.includes(c.id));
    container.innerHTML = featured.map(c => `
        <a href="detail.html#${c.id}" class="char-card-mini">
            <img src="${c.image}" alt="${c.name}">
            <span>${c.name}</span>
        </a>`).join('');
}

async function renderRecentChanges() {
    const list = document.getElementById('home-recent-list');
    if (!list) return;
    try {
        const q = query(collection(db, "characters"), orderBy("updatedAt", "desc"), limit(12));
        const snap = await getDocs(q);
        list.innerHTML = snap.docs.map(doc => {
            const d = doc.data();
            return `
                <div class="recent-item">
                    <a href="detail.html#${doc.id}" class="recent-link">${d.name}</a>
                    <div class="recent-meta">
                        <span>${d.updatedBy || '익명'}</span>
                        <span>${new Date(d.updatedAt?.seconds*1000||d.updatedAt).toLocaleDateString()}</span>
                    </div>
                </div>`;
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
            <div class="category-section" style="margin-top:2.5rem;">
                <h3 class="category-title" style="font-size:1.2rem; border-bottom:1px solid #ddd; padding-bottom:0.3rem; margin-bottom:1rem; color:var(--primary-dark); font-weight:800;">${cat}</h3>
                <div class="char-grid-portal">
                    ${catChars.map(c => `<a href="detail.html#${c.id}" class="char-card-mini"><img src="${c.image}" alt="${c.name}"><span>${c.name}</span></a>`).join('')}
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
        if (val.length < 1) { 
            results.classList.remove('active'); 
            return; 
        }
        
        // 1. 캐릭터 리스트에서 검색
        const matches = CHARACTERS.filter(c => 
            c.name.toLowerCase().includes(val) || 
            c.id.toLowerCase().includes(val)
        ).slice(0, 10);

        if (matches.length > 0) {
            results.innerHTML = matches.map(m => `
                <div class="search-item" onclick="location.href='detail.html#${m.id}'">
                    <strong>${m.name}</strong> <span style="font-size:0.7rem; color:#999;">(${m.id})</span>
                </div>`).join('');
        } else {
            results.innerHTML = `
                <div class="search-item" onclick="location.href='edit.html#${val}'">
                    <span style="color:var(--primary-color);">"${val}"</span> 신규 문서 만들기
                </div>`;
        }
        results.classList.add('active');
    };

    // 바깥 클릭 시 닫기
    document.addEventListener('click', (e) => {
        if (!input.contains(e.target)) results.classList.remove('active');
    });
}

window.addEventListener('load', initHome);
