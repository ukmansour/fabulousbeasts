import { CHARACTERS, CATEGORIES } from './data.js';
import { db, auth, getDocSafe, getDocsSafe } from './firebase-config.js';
import { collection, doc, setDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

let mergedCharacters = [...CHARACTERS];
let recentChangesTimer = null;

onAuthStateChanged(auth, async (user) => {
    const info = document.getElementById('user-info');
    if (!info) return;
    if (user) {
        let isAdmin = false;
        try {
            const userRef = doc(db, "users", user.uid);
            const userSnap = await getDocSafe(userRef);
            
            if (userSnap.exists()) {
                const userData = userSnap.data();
                if (userData.role === 'banned') {
                    alert("⚠️ 귀하의 계정은 차단되었습니다. 사이트 이용이 불가능합니다.");
                    document.body.innerHTML = `
                        <div style="height:100vh; display:flex; flex-direction:column; justify-content:center; align-items:center; background:#f8f9fa; font-family:sans-serif;">
                            <h1 style="color:#dc2626; font-size:3rem; margin-bottom:1rem;">🚫 접근 차단됨</h1>
                            <p style="font-size:1.2rem; color:#666;">관리자에 의해 이용 권한이 제한되었습니다.</p>
                            <button onclick="auth.signOut().then(() => location.reload())" style="margin-top:2rem; padding:0.8rem 2rem; background:#4b5563; color:white; border:none; border-radius:4px; cursor:pointer; font-weight:bold;">로그아웃</button>
                        </div>
                    `;
                    return;
                }
                isAdmin = userData.role === 'admin';
                // [이메일 정보 업데이트] 이메일이 기록되지 않은 경우를 대비
                if (!userData.email && user.email) {
                    await updateDoc(userRef, { email: user.email });
                }
            } else {
                // [가입 즉시 등록 로직] 문서가 없으면 그 즉시 생성 (0.1초 지연도 허용 안함)
                console.log("Creating missing user document for:", user.uid);
                const isSupremeAdmin = user.email === "hodu@youshouyan.wiki"; 
                
                // 이메일 앞부분을 닉네임으로 추출 (없으면 '회원' 등 기본값)
                const autoNickname = user.email ? user.email.split('@')[0] : (user.displayName || "회원");

                const newUserData = {
                    uid: user.uid,
                    nickname: autoNickname,
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
            if (user.email === "hodu@youshouyan.wiki") isAdmin = true;
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
                if (confirm("로그아웃하시습니까?")) signOut(auth).then(() => location.reload());
            };
        }
    } else {
        info.innerHTML = `<a href="auth.html" class="nav-link">로그인</a>`;
    }
});

async function initHome() {
    // 1. 먼저 기본 데이터로 렌더링 (즉각적인 반응성)
    renderCategoryGrid();
    initSearch();
    
    // 2. 비동기로 클라우드 데이터 가져와서 업데이트
    await fetchFirestoreData();
    
    // 3. 업데이트된 데이터로 다시 렌더링
    renderCategoryGrid();
    renderRecentChanges();
    loadNotice();
}

async function fetchFirestoreData() {
    try {
        console.log("Fetching Firestore data for home page...");
        // 한 번에 최대 50개까지만 가져오도록 제한
        const snap = await getDocsSafe(collection(db, "characters"), 50);
        const firestoreChars = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log(`Successfully fetched ${firestoreChars.length} characters from Firestore`);
        
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
    const newsEl = document.getElementById('home-news');
    const guideEl = document.getElementById('home-guide');
    
    try {
        if (el) {
            const snap = await getDocSafe(doc(db, "notices", "main"));
            if (snap.exists() && snap.data().content) {
                el.textContent = snap.data().content;
                el.style.color = '#333';
            }
        }
        
        if (newsEl) {
            const newsSnap = await getDocSafe(doc(db, "notices", "news"));
            if (newsSnap.exists() && newsSnap.data().content) {
                newsEl.innerHTML = renderMarkdown(newsSnap.data().content);
            }
        }

        if (guideEl) {
            const guideSnap = await getDocSafe(doc(db, "notices", "guide"));
            if (guideSnap.exists() && guideSnap.data().content) {
                guideEl.innerHTML = renderMarkdown(guideSnap.data().content);
            }
        }
    } catch (e) {
        console.error("Notice/News load error:", e);
    }
}

function renderMarkdown(text) {
    if (!text) return '';
    let html = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .split('\n').map(line => {
            if (line.startsWith('## ')) return `<h2>${line.replace('## ', '')}</h2>`;
            if (line.startsWith('### ')) return `<h3>${line.replace('### ', '')}</h3>`;
            if (line === '---') return '<hr>';
            if (line.startsWith('* ') || line.startsWith('• ')) {
                return `<li>${line.substring(2)}</li>`;
            }
            return `<p>${line}</p>`;
        }).join('');

    html = html
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" style="max-width:100%; border-radius:4px; display:block; margin:10px auto;">')
        .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');

    html = html.replace(/(<li>.*?<\/li>)+/g, '<ul>$&</ul>');
    return html;
}

async function renderRecentChanges() {
    const list = document.getElementById('home-recent-list');
    if (!list) return;
    
    try {
        // 최근 변경 사항은 최대 8개면 충분함
        const snap = await getDocsSafe(collection(db, "characters"), 8);
        
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
            });
        
        list.innerHTML = sorted.map(d => {
            let dateStr = '-';
            if (d.updatedAt?.seconds) {
                dateStr = new Date(d.updatedAt.seconds * 1000).toLocaleString('ko-KR');
            }
            return `
                <div class="recent-item" style="margin-bottom:12px; padding-bottom:8px; border-bottom:1px solid #f0f0f0;">
                    <a href="detail.html#${d.id}" class="recent-link" style="font-weight:700; color:var(--text-link); text-decoration:none; font-size:14px;">${d.name || d.id}</a>
                    <div class="recent-meta" style="font-size:11px; color:#999; margin-top:2px;">
                        <span>${d.updatedBy || '익명'}</span> | <span>${dateStr}</span>
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
