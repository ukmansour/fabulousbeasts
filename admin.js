import { db, auth, getDocSafe } from './firebase-config.js';
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
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
    if (!user) { location.href = 'auth.html'; return; }
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
                    auth.signOut().then(() => location.reload());
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

        // [읽기 최적화] 세션 캐시 확인
        const userSnap = await getDocSafe(doc(db, "users", user.uid));
        if (userSnap.exists() && userSnap.data().role === 'admin') {
            sessionStorage.setItem(`role_${user.uid}`, 'admin');
            renderAdminPage();
            renderWikiAdminPage();
        } else {
            showRecoveryUI();
        }
    } catch (e) {
        console.error(e);
        showRecoveryUI();
    }
});

function showRecoveryUI() {
    contentArea.innerHTML = `
        <div style="text-align:center; padding:3rem; background:#f9f9f9; border:2px solid #555; max-width:500px; margin:2rem auto;">
            <h2 style="color:#333; text-transform:uppercase; letter-spacing:1px;">ADMIN RECOVERY</h2>
            <p style="margin-top:1rem; color:#666; font-size:0.9rem;">ENTER SECURITY CODE TO ACTIVATE ADMINISTRATIVE PRIVILEGES.</p>
            <input type="password" id="recovery-code" placeholder="SECURITY CODE" 
                style="margin-top:1.5rem; padding:0.6rem 1rem; border:1px solid #ccc; border-radius:0; font-size:1rem; width:200px; display:block; margin-left:auto; margin-right:auto; font-family:monospace; text-align:center;">
            <button id="recovery-btn" 
                style="margin-top:1rem; padding:0.8rem 2rem; background:#333; color:white; border:none; border-radius:0; font-weight:bold; cursor:pointer; font-size:1rem; text-transform:uppercase;">
                ACTIVATE
            </button>
        </div>
    `;

    document.getElementById('recovery-btn').onclick = async () => {
        const code = document.getElementById('recovery-code').value;
        if (code !== "9889") { alert("보안 코드가 틀렸습니다."); return; }

        try {
            await setDoc(doc(db, "users", currentUser.uid), {
                uid: currentUser.uid,
                nickname: currentUser.displayName || "관리자",
                email: currentUser.email || "",
                role: 'admin',
                updatedAt: serverTimestamp()
            }, { merge: true });
            
            sessionStorage.setItem(`role_${currentUser.uid}`, 'admin');
            alert("관리자 등록 완료!");
            location.reload();
        } catch (e) {
            alert("등록 실패: " + e.message);
        }
    };
}

async function renderAdminPage() {
    if (!contentArea) return;
    contentArea.innerHTML = `
        <div style="display:flex; justify-content:center; padding:2rem;">
            <div class="loading-spinner" style="border: 2px solid #f3f3f3; border-top: 3px solid var(--primary-color); border-radius: 50%; width: 24px; height: 24px; animation: spin 1s linear infinite;"></div>
        </div>
        <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
    `;
    
    try {
        // [수정] Firestore가 아닌 D1 API에서 유저 목록을 가져옵니다.
        const response = await fetch('/api/users');
        if (!response.ok) throw new Error('D1 사용자 목록 로드 실패');
        const users = await response.json();

        if (users.length === 0) {
            contentArea.innerHTML = `
                <div style="text-align:center; padding:3rem; color:#999;">
                    <p style="font-size:0.85rem; margin-bottom:1.5rem;">데이터베이스(D1)에 가입한 회원이 없습니다.</p>
                    <button onclick="window.importFirestoreUsers()" style="padding:0.6rem 1.2rem; background:#f3f4f6; border:1px solid #ddd; border-radius:6px; cursor:pointer; font-weight:700; font-size:0.8rem;">기존 Firestore 유저 불러오기</button>
                </div>`;
            return;
        }

        let html = `
            <div style="max-width:900px; margin:0 auto; padding:0; background:white; border:1px solid #ccc;">
                <div style="display:flex; justify-content:space-between; align-items:center; padding:0.8rem 1rem; background:#f0f0f0; border-bottom:1px solid #ccc;">
                    <h2 style="font-size:1rem; font-weight:900; color:#111; margin:0; text-transform:uppercase;">USER MANAGEMENT (${users.length})</h2>
                    <button onclick="window.importFirestoreUsers()" style="font-size:0.75rem; color:#555; background:white; border:1px solid #ccc; padding:2px 8px; cursor:pointer; font-weight:700;">Sync Firestore</button>
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
            } else if (u.role === 'banned') {
                roleText = '차단';
                roleColor = '#dc2626';
                roleBg = '#fef2f2';
            }

            const displayName = u.nickname || (u.email ? u.email.split('@')[0] : 'UNKNOWN');

            html += `
                <div style="display:flex; align-items:center; gap:1rem; padding:0.8rem 1rem; ${index !== users.length - 1 ? 'border-bottom:1px solid #ccc;' : ''} transition:background 0.1s;" onmouseover="this.style.background='#fcfcfc'" onmouseout="this.style.background='transparent'">
                    <div style="flex:1; min-width:0; display:flex; align-items:center; gap:1.2rem;">
                        <span style="font-size:0.9rem; font-weight:800; color:#000; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; min-width:120px; font-family:monospace;">${displayName}</span>
                        <span style="font-size:0.8rem; color:#666; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex:1; font-family:monospace;">${u.email || 'NO EMAIL'}</span>
                    </div>

                    <div style="display:flex; align-items:center; gap:0.8rem;">
                        <span style="background:${roleBg}; color:${roleColor}; padding:2px 8px; border:1px solid ${roleColor}; font-size:0.7rem; font-weight:800; white-space:nowrap; text-transform:uppercase;">
                            ${roleText}
                        </span>
                        
                        <select onchange="window.changeUserRole('${u.uid}', this.value)" style="padding:0.3rem 0.6rem; border:1px solid #999; border-radius:0; font-size:0.75rem; background:#fff; cursor:pointer; outline:none; font-weight:700; color:#333; width:110px; font-family:monospace;">
                            <option value="">CHANGE ROLE</option>
                            <option value="member">MEMBER</option>
                            <option value="admin">ADMIN</option>
                            <option value="banned">BANNED</option>
                        </select>
                    </div>
                </div>
            `;
        });

        html += `
                </div>
            </div>
            <p style="text-align:center; font-size:0.7rem; color:#aaa; margin-top:1.5rem;">🔒 관리 권한 변경은 시스템에 즉시 반영됩니다.</p>
        `;
        contentArea.innerHTML = html;
    } catch (e) {
        console.error("사용자 목록 불러오기 실패:", e);
        contentArea.innerHTML = `<div style="text-align:center; padding:2rem; color:#dc2626; font-size:0.85rem;">오류: ${e.message}</div>`;
    }
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
            <h2 style="font-weight:900; margin-bottom:0.5rem; font-size:1.2rem; text-transform:uppercase;">CREATE DOCUMENT</h2>
            <p style="color:#666; font-size:0.85rem; margin-bottom:2rem;">Enter an ID to create or edit a document.</p>
            
            <div style="margin-bottom:1.5rem;">
                <label style="display:block; font-size:0.8rem; font-weight:800; color:#444; margin-bottom:0.5rem;">DOCUMENT ID</label>
                <input type="text" id="new-doc-id" placeholder="e.g., tianlu" 
                    style="width:100%; padding:0.8rem; border:1px solid #ccc; border-radius:0; font-size:1rem; outline:none; font-family:monospace;">
            </div>
            
            <button id="create-doc-btn" style="width:100%; padding:1rem; background:#333; color:white; border:none; border-radius:0; font-weight:900; cursor:pointer; font-size:1rem;">
                PROCEED TO EDITOR
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
    if (!confirm(`해당 사용자를 ${actionText}하시겠습니까?`)) {
        renderAdminPage(); // select 값 원상복구
        return;
    }

    const code = prompt("보안 코드를 입력하세요:");
    if (code !== "9889") { 
        alert("보안 코드가 틀렸습니다."); 
        renderAdminPage();
        return; 
    }

    try {
        const res = await fetch('/api/user/role', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uid, role: newRole })
        });
        
        if (!res.ok) throw new Error('서버 요청 실패');

        alert(`${actionText} 완료!`);
        renderAdminPage(); // 성공 시 새로고침
    } catch (e) {
        alert("오류 발생: " + e.message);
        renderAdminPage();
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
                    <h3 style="font-weight:900; margin-bottom:1rem; text-transform:uppercase; font-size:1rem;">ANNOUNCEMENTS</h3>
                    <textarea id="edit-notice" style="width:100%; min-height:350px; padding:0.8rem; border:1px solid #ccc; border-radius:0; font-size:0.9rem; line-height:1.6; resize:vertical; outline:none; font-family:monospace;">${settings.notice || ''}</textarea>
                </div>

                <!-- 최근 소식 -->
                <div style="background:white; border:1px solid #ccc; padding:1.5rem;">
                    <h3 style="font-weight:900; margin-bottom:1rem; text-transform:uppercase; font-size:1rem;">LATEST NEWS</h3>
                    <textarea id="edit-news" style="width:100%; min-height:350px; padding:0.8rem; border:1px solid #ccc; border-radius:0; font-size:0.9rem; line-height:1.6; resize:vertical; outline:none; font-family:monospace;">${settings.news || ''}</textarea>
                </div>
            </div>
            <div style="text-align:center; margin-top:2rem;">
                <button id="save-settings-btn" style="padding:1rem 4rem; background:#333; color:white; border:none; border-radius:0; font-weight:900; cursor:pointer; font-size:1.1rem; text-transform:uppercase;">COMMIT SETTINGS</button>
                <p style="margin-top:1rem; color:#666; font-size:0.75rem;">Authentication required for persistence.</p>
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
