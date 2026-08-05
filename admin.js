import { db, auth } from './firebase-config.js';
import { 
    doc, 
    updateDoc, 
    serverTimestamp, 
    collection, 
    onSnapshot, 
    query, 
    orderBy 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// 툴바 버튼 이벤트 리스너 설정 (사용자 관리 페이지에서 필요하지 않다면 빈 함수로 두거나 제거)
function initAdminToolbars() {
    // 사용자 관리에서는 현재 사용하지 않음
}

const contentArea = document.getElementById('admin-content');
const wikiContentArea = document.getElementById('wiki-admin-content');
let currentUser = null;

// [추가] 탭 전환 이벤트 리스너
window.addEventListener('adminTabSwitch', (e) => {
    const tabId = e.detail;
    if (tabId === 'wiki') {
        renderWikiAdminPage();
    } else if (tabId === 'settings') {
        renderSettingsAdminPage();
    } else {
        renderAdminPage();
    }
});

onAuthStateChanged(auth, async (user) => {
    const info = document.getElementById('user-info');
    if (!user) { 
        alert('로그인이 필요합니다.');
        location.href = 'auth.html'; 
        return; 
    }
    currentUser = user;

    // [읽기 최적화] 헤더에 표시할 이름은 Auth에서 가져옵니다 (DB 읽기 0)
    if (info) {
        const nickname = user.displayName || user.email?.split('@')[0] || "관리자";
        info.innerHTML = `
            <span style="color:white; font-size:0.75rem; margin-right:1rem;">${nickname}님</span>
            <a href="#" class="nav-link" id="logout-btn">로그아웃</a>
        `;
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.onclick = (e) => {
                e.preventDefault();
                if (confirm("로그아웃하시습니까?")) {
                    sessionStorage.removeItem(`role_${user.uid}`);
                    auth.signOut().then(() => location.href = 'index.html');
                }
            };
        }
    }

    try {
        // [읽기 최적화] 마스터 관리자 계정은 즉시 허용 (DB 읽기 0)
        if (user.email === "hodu@youshouyan.wiki") {
            renderAdminPage();
            renderWikiAdminPage(); // 초기 로드 시 둘 다 렌더링 준비
            return;
        }

        // [권한 확인] 일반 사용자는 Firestore에서 역할 확인
        const userSnap = await getDocSafe(doc(db, "users", user.uid));
        if (userSnap.exists() && userSnap.data().role === 'admin') {
            sessionStorage.setItem(`role_${user.uid}`, 'admin');
            renderAdminPage();
            renderWikiAdminPage();
        } else {
            // 관리자가 아닌 경우 접근 차단
            document.body.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; background: #f5f5f5; padding: 2rem; text-align: center;">
                    <div style="font-size: 4rem; margin-bottom: 1rem;">🚫</div>
                    <h1 style="font-size: 2rem; font-weight: 900; color: #333; margin-bottom: 0.5rem;">접근 권한이 없습니다</h1>
                    <p style="color: #666; font-size: 1rem; margin-bottom: 2rem;">이 페이지는 관리자만 접근할 수 있습니다.</p>
                    <a href="index.html" style="padding: 0.8rem 2rem; background: var(--primary-color); color: white; text-decoration: none; border-radius: 6px; font-weight: 700; font-size: 0.95rem;">홈으로 돌아가기</a>
                </div>
            `;
            return;
        }
    } catch (e) {
        console.error(e);
        // 오류 발생 시에도 접근 차단
        document.body.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; background: #f5f5f5; padding: 2rem; text-align: center;">
                <div style="font-size: 4rem; margin-bottom: 1rem;">⚠️</div>
                <h1 style="font-size: 2rem; font-weight: 900; color: #333; margin-bottom: 0.5rem;">오류가 발생했습니다</h1>
                <p style="color: #666; font-size: 1rem; margin-bottom: 2rem;">권한을 확인할 수 없습니다.</p>
                <a href="index.html" style="padding: 0.8rem 2rem; background: var(--primary-color); color: white; text-decoration: none; border-radius: 6px; font-weight: 700; font-size: 0.95rem;">홈으로 돌아가기</a>
            </div>
        `;
    }
});

let unsubscribeUsers = null;

async function renderAdminPage() {
    if (!contentArea) return;
    
    // 이전 리스너가 있다면 해제
    if (unsubscribeUsers) unsubscribeUsers();

    contentArea.innerHTML = `
        <div style="display:flex; justify-content:center; padding:2rem;">
            <div class="loading-spinner" style="border: 2px solid #f3f3f3; border-top: 3px solid #333; border-radius: 50%; width: 24px; height: 24px; animation: spin 1s linear infinite;"></div>
        </div>
    `;
    
    // [실시간 업데이트] Firestore users 컬렉션을 감시합니다.
    const q = query(collection(db, "users"), orderBy("updatedAt", "desc"));
    
    unsubscribeUsers = onSnapshot(q, (snapshot) => {
        const users = [];
        snapshot.forEach(doc => users.push(doc.data()));

        if (users.length === 0) {
            contentArea.innerHTML = `
                <div style="text-align:center; padding:3rem; color:#999;">
                    <p style="font-size:0.85rem; margin-bottom:1.5rem;">가입한 회원이 없습니다.</p>
                </div>`;
            return;
        }

        let html = `
            <div style="max-width:900px; margin:0 auto; padding:0; background:white; border:1px solid #ccc;">
                <div style="display:flex; justify-content:space-between; align-items:center; padding:0.8rem 1rem; background:#f0f0f0; border-bottom:1px solid #ccc;">
                    <h2 style="font-size:1rem; font-weight:900; color:#111; margin:0;">사용자 관리 (${users.length})</h2>
                    <span style="font-size:0.7rem; color:#666;">실시간 동기화 중</span>
                </div>
                
                <div style="display:flex; flex-direction:column;">
        `;

        users.forEach((u, index) => {
            let roleText = '멤버';
            let roleColor = '#0284c7';
            let roleBg = '#f0f9ff';
            
            if (u.role === 'admin') {
                roleText = '관리자';
                roleColor = '#d97706';
                roleBg = '#fffbeb';
            } else if (u.isBanned === true) {
                roleText = '차단';
                roleColor = '#dc2626';
                roleBg = '#fef2f2';
            }

            // [방어 코드] 이름이 없으면 익명 표시
            const displayName = u.name || u.nickname || (u.email ? u.email.split('@')[0] : '익명');

            html += `
                <div style="display:flex; align-items:center; gap:1rem; padding:0.8rem 1rem; ${index !== users.length - 1 ? 'border-bottom:1px solid #ccc;' : ''} transition:background 0.1s;" onmouseover="this.style.background='#fcfcfc'" onmouseout="this.style.background='transparent'">
                    <div style="flex:1; min-width:0; display:flex; align-items:center; gap:1.2rem;">
                        <span style="font-size:0.9rem; font-weight:800; color:#000; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; min-width:120px;">${displayName}</span>
                        <span style="font-size:0.8rem; color:#666; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex:1; font-family:monospace;">${u.email || '이메일 없음'}</span>
                    </div>

                    <div style="display:flex; align-items:center; gap:0.8rem;">
                        <span style="background:${roleBg}; color:${roleColor}; padding:2px 8px; border:1px solid ${roleColor}; font-size:0.7rem; font-weight:800; white-space:nowrap; text-transform:uppercase;">
                            ${roleText}
                        </span>
                        
                        <select onchange="window.changeUserRole('${u.uid}', this.value)" style="padding:0.3rem 0.6rem; border:1px solid #999; border-radius:0; font-size:0.75rem; background:#fff; cursor:pointer; outline:none; font-weight:700; color:#333; width:110px;">
                            <option value="">권한 변경</option>
                            <option value="member">멤버</option>
                            <option value="admin">관리자</option>
                            <option value="banned">차단하기</option>
                        </select>
                    </div>
                </div>
            `;
        });

        html += `
                </div>
            </div>
            <p style="text-align:center; font-size:0.7rem; color:#aaa; margin-top:1.5rem;">🔒 관리 권한 변경은 데이터 유실 없이 안전하게 처리됩니다.</p>
        `;
        contentArea.innerHTML = html;
    }, (error) => {
        console.error("Firestore listen failed:", error);
        contentArea.innerHTML = `<div style="text-align:center; padding:2rem; color:red;">권한이 없거나 데이터를 불러올 수 없습니다.</div>`;
    });
}

// [추가] Firestore의 유저 데이터를 D1으로 동기화하는 함수
window.importFirestoreUsers = async () => {
    const code = prompt("데이터 동기화를 위한 보안 코드를 입력하세요:");
    if (code !== "9889") { alert("보안 코드가 틀렸습니다."); return; }

    if (!confirm("Firestore에 저장된 사용자들을 D1 데이터베이스로 가져오시겠습니까?")) return;

    try {
        const { collection, getDocs } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
        const snapshot = await getDocs(collection(db, "users"));
        
        let count = 0;
        for (const docSnap of snapshot.docs) {
            const u = docSnap.data();
            await fetch('/api/user/role', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    uid: u.uid,
                    role: u.role || 'member',
                    nickname: u.nickname || '',
                    email: u.email || '',
                    secret: '9889'
                })
            });
            count++;
        }
        
        alert(`${count}명의 사용자를 성공적으로 동기화했습니다!`);
        renderAdminPage();
    } catch (e) {
        alert("동기화 실패: " + e.message);
    }
};

// [추가] 문서 관리(Wiki) 탭 렌더링
function renderWikiAdminPage() {
    if (!wikiContentArea) return;
    wikiContentArea.innerHTML = `
        <div style="max-width:700px; margin:1rem auto; padding:2rem; background:white; border:1px solid #ccc;">
            <h2 style="font-weight:900; margin-bottom:0.5rem; font-size:1.2rem;">문서 생성 및 관리</h2>
            <p style="color:#666; font-size:0.85rem; margin-bottom:2rem;">새로 만들거나 편집할 문서의 ID를 입력하세요.</p>
            
            <div style="margin-bottom:1.5rem;">
                <label style="display:block; font-size:0.8rem; font-weight:800; color:#444; margin-bottom:0.5rem;">문서 ID</label>
                <input type="text" id="new-doc-id" placeholder="예: tianlu" 
                    style="width:100%; padding:0.8rem; border:1px solid #ccc; border-radius:0; font-size:1rem; outline:none; font-family:inherit;">
            </div>
            
            <button id="create-doc-btn" style="width:100%; padding:1rem; background:#333; color:white; border:none; border-radius:0; font-weight:900; cursor:pointer; font-size:1rem;">
                편집기 열기
            </button>
        </div>
    `;

    document.getElementById('create-doc-btn').onclick = () => {
        const id = document.getElementById('new-doc-id').value.trim();
        if (!id) { alert("문서 ID를 입력해 주세요."); return; }
        
        // 특수문자 및 공백 처리 (URL 해시용)
        const safeId = encodeURIComponent(id);
        location.href = `edit.html#${safeId}`;
    };
}


window.changeUserRole = async (uid, newRole) => {
    if (!newRole) return;
    
    let actionText = newRole === 'admin' ? '관리자로 승격' : newRole === 'banned' ? '차단' : '일반 멤버로 변경';
    if (!confirm(`해당 사용자를 ${actionText}하시겠습니까?`)) return;

    const code = prompt("보안 코드를 입력하세요:");
    if (code !== "9889") { alert("보안 코드가 틀렸습니다."); return; }

    try {
        // [안전한 수정] updateDoc을 사용하여 기존 필드(name, email 등)를 유지하며 특정 필드만 수정합니다.
        const userRef = doc(db, "users", uid);
        await updateDoc(userRef, {
            role: newRole,
            isBanned: newRole === 'banned',
            updatedAt: serverTimestamp()
        });

        // Cloudflare D1 동기화
        const res = await fetch('/api/user/role', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uid, role: newRole, isBanned: newRole === 'banned', secret: code })
        });
        
        if (!res.ok) throw new Error('D1 동기화 실패');

        alert(`${actionText} 완료!`);
        // onSnapshot이 실시간으로 화면을 갱신하므로 별도의 render 호출 불필요
    } catch (e) {
        alert("오류 발생: " + e.message);
    }
};

// [추가] 공지/소식 관리 탭 렌더링
async function renderSettingsAdminPage() {
    const settingsArea = document.getElementById('settings-admin-content');
    if (!settingsArea) return;

    settingsArea.innerHTML = '<div style="text-align:center; padding:2rem;">설정을 불러오는 중...</div>';

    try {
        const res = await fetch('/api/settings');
        if (!res.ok) throw new Error('설정 로드 실패');
        const settings = await res.json();

        settingsArea.innerHTML = `
            <div style="max-width:900px; margin:0 auto; display:grid; grid-template-columns: 1fr 1fr; gap:1.5rem;">
                <!-- 공지사항 -->
                <div style="background:white; border:1px solid #ccc; padding:1.5rem;">
                    <h3 style="font-weight:900; margin-bottom:1rem; font-size:1rem;">공지사항 관리</h3>
                    <textarea id="edit-notice" style="width:100%; min-height:350px; padding:0.8rem; border:1px solid #ccc; border-radius:0; font-size:0.9rem; line-height:1.6; resize:vertical; outline:none; font-family:inherit;">${settings.notice || ''}</textarea>
                </div>

                <!-- 최근 소식 -->
                <div style="background:white; border:1px solid #ccc; padding:1.5rem;">
                    <h3 style="font-weight:900; margin-bottom:1rem; font-size:1rem;">최근 소식 관리</h3>
                    <textarea id="edit-news" style="width:100%; min-height:350px; padding:0.8rem; border:1px solid #ccc; border-radius:0; font-size:0.9rem; line-height:1.6; resize:vertical; outline:none; font-family:inherit;">${settings.news || ''}</textarea>
                </div>
            </div>
            <div style="text-align:center; margin-top:2rem;">
                <button id="save-settings-btn" style="padding:1rem 4rem; background:#333; color:white; border:none; border-radius:0; font-weight:900; cursor:pointer; font-size:1.1rem;">설정 저장하기</button>
                <p style="margin-top:1rem; color:#666; font-size:0.75rem;">변경 사항을 저장하려면 보안 코드가 필요합니다.</p>
            </div>
        `;

        document.getElementById('save-settings-btn').onclick = async () => {
            const notice = document.getElementById('edit-notice').value;
            const news = document.getElementById('edit-news').value;
            const secret = prompt("보안 코드를 입력하세요:");
            if (secret !== "9889") { alert("보안 코드가 틀렸습니다."); return; }

            try {
                const saveRes = await fetch('/api/settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ notice, news, secret })
                });

                if (!saveRes.ok) throw new Error('저장 실패');
                alert("공지 및 소식이 성공적으로 저장되었습니다!");
                location.reload();
            } catch (e) {
                alert("오류 발생: " + e.message);
            }
        };
    } catch (e) {
        settingsArea.innerHTML = `<div style="text-align:center; padding:2rem; color:red;">오류: ${e.message}</div>`;
    }
}

initAdminToolbars();
