import { CHARACTERS, CATEGORIES } from './data.js';
import { db, auth } from './firebase-config.js';
import { collection, getDocs, orderBy, query } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// 유저 상태 관리 (안전하게 실행)
if (auth && typeof auth.onAuthStateChanged === 'function') {
    onAuthStateChanged(auth, (user) => {
        const userInfo = document.getElementById('user-info');
        if (!userInfo) return;
        if (user) {
            const displayName = user.displayName || user.email.split('@')[0];
            userInfo.innerHTML = `
                <span class="nav-link" style="color: var(--secondary-color); font-weight: 700;">${displayName}님</span>
                <a href="#" class="nav-link" id="logout-btn">로그아웃</a>
            `;
            document.getElementById('logout-btn')?.addEventListener('click', (e) => {
                e.preventDefault();
                signOut(auth);
            });
        } else {
            userInfo.innerHTML = `<a href="auth.html" class="nav-link" id="login-link">로그인</a>`;
        }
    });
}

async function getCharactersFromFirestore() {
    if (!db || Object.keys(db).length === 0) return CHARACTERS;
    try {
        const querySnapshot = await getDocs(collection(db, "characters"));
        const firestoreChars = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        const combined = [...CHARACTERS];
        firestoreChars.forEach(fChar => {
            const index = combined.findIndex(c => c.id === fChar.id);
            if (index !== -1) {
                combined[index] = { ...combined[index], ...fChar };
            } else {
                combined.push(fChar);
            }
        });
        return combined;
    } catch (e) {
        console.warn("Firestore data error, using local:", e);
        return CHARACTERS;
    }
}

async function getCategoriesFromFirestore() {
    if (!db || Object.keys(db).length === 0) return CATEGORIES;
    try {
        const q = query(collection(db, "categories"), orderBy("order"));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) return CATEGORIES;
        return querySnapshot.docs.map(doc => doc.data().name);
    } catch (e) {
        return CATEGORIES;
    }
}

async function navigate() {
    const hash = window.location.hash || '#home';
    const views = document.querySelectorAll('.view');
    const navLinks = document.querySelectorAll('.nav-link');

    // 1. 모든 뷰 숨기기
    views.forEach(v => {
        v.style.display = 'none';
    });

    // 2. 모든 네비 링크 비활성화
    navLinks.forEach(l => {
        l.classList.remove('active');
        if (l.getAttribute('href') === hash) {
            l.classList.add('active');
        }
    });

    // 3. 대상 뷰 찾기 및 표시
    const rawId = hash.replace('#', '');
    const viewId = `view-${rawId}`;
    let targetView = document.getElementById(viewId);
    
    // 만약 #watch 대신 #animation 같은 다른 이름을 쓴 경우 보정
    if (!targetView && rawId === 'watch') targetView = document.getElementById('view-watch');
    
    if (targetView) {
        targetView.style.display = 'block';
    } else {
        // 찾지 못하면 무조건 홈 표시
        const homeView = document.getElementById('view-home');
        if (homeView) homeView.style.display = 'block';
    }

    // 4. 섹션별 추가 로직
    if (hash === '#watch') {
        renderPlaylist();
    } else if (hash === '#characters') {
        const chars = await getCharactersFromFirestore();
        const cats = await getCategoriesFromFirestore();
        renderCharacters(chars, cats);
    }
    
    window.scrollTo(0, 0);
}

function renderCharacters(chars, cats) {
    const grid = document.getElementById('char-grid');
    if (!grid) return;
    
    grid.innerHTML = cats.map(cat => {
        const catChars = chars.filter(c => c.category === cat);
        if (catChars.length === 0) return '';
        
        return `
            <div class="category-section" style="grid-column: 1 / -1;">
                <h3 class="category-title" style="margin: 2rem 0 1.5rem 0; padding-left: 1rem; border-left: 5px solid var(--primary-color);">${cat}</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 2rem;">
                    ${catChars.map(char => `
                        <div class="character-card" onclick="location.href='detail.html#${char.id}'">
                            <div class="card-img-wrap">
                                <img src="${char.image}" alt="${char.name}" loading="lazy">
                            </div>
                            <div class="card-info">
                                <h4>${char.name}</h4>
                                <p>${char.title}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }).join('');
}

function renderPlaylist() {
    const playlist = document.getElementById('episode-playlist');
    const player = document.getElementById('main-player');
    if (!playlist || !player) return;

    if (playlist.children.length > 0) return;

    playlist.innerHTML = '';
    const seasons = [
        { name: "시즌 1", range: [1, 12] },
        { name: "시즌 2", range: [13, 24] },
        { name: "시즌 3", range: [25, 36] },
        { name: "시즌 4", range: [37, 48] },
        { name: "시즌 5", range: [49, 60] }
    ];

    seasons.forEach(season => {
        const header = document.createElement('li');
        header.className = 'season-header';
        header.textContent = season.name;
        playlist.appendChild(header);

        for(let i = season.range[0]; i <= season.range[1]; i++) {
            const item = document.createElement('li');
            item.textContent = `${i}화`;
            item.addEventListener('click', () => {
                player.src = `https://media.fabulousbeasts.kr/${i}화.mp4`;
                player.play();
                playlist.querySelectorAll('li').forEach(li => li.classList.remove('active'));
                item.classList.add('active');
            });
            playlist.appendChild(item);
        }
    });
}

// 이벤트 리스너 등록
window.addEventListener('hashchange', navigate);
window.addEventListener('load', navigate);

// 초기 실행
navigate();

// 사이드바 토글
const sidebar = document.getElementById('main-sidebar');
const sidebarToggle = document.getElementById('sidebar-toggle');
if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', () => {
        sidebar.classList.toggle('active');
    });
}
