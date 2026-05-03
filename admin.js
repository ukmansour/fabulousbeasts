import { db, auth, getDocSafe } from './firebase-config.js';
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// 툴바 버튼 이벤트 리스너 설정 (사용자 관리 페이지에서 필요하지 않다면 빈 함수로 두거나 제거)
function initAdminToolbars() {
    // 사용자 관리에서는 현재 사용하지 않음
}

const contentArea = document.getElementById('admin-content');
let currentUser = null;

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
            return;
        }

        // [읽기 최적화] 세션 캐시 확인
        const userSnap = await getDocSafe(doc(db, "users", user.uid));
        if (userSnap.exists() && userSnap.data().role === 'admin') {
            sessionStorage.setItem(`role_${user.uid}`, 'admin');
            renderAdminPage();
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
        <div style="text-align:center; padding:3rem; background:#fffbe6; border:2px solid #ffe58f; border-radius:8px; max-width:500px; margin:2rem auto;">
            <h2 style="color:#856404;">관리자 권한 복구</h2>
            <p style="margin-top:1rem; color:#555;">보안 코드로 현재 계정을 관리자로 등록할 수 있습니다.</p>
            <input type="password" id="recovery-code" placeholder="보안 코드 입력" 
                style="margin-top:1.5rem; padding:0.6rem 1rem; border:1px solid #ccc; border-radius:4px; font-size:1rem; width:200px; display:block; margin-left:auto; margin-right:auto;">
            <button id="recovery-btn" 
                style="margin-top:1rem; padding:0.8rem 2rem; background:#00a0e9; color:white; border:none; border-radius:4px; font-weight:bold; cursor:pointer; font-size:1rem;">
                관리자로 등록
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
    contentArea.innerHTML = `
        <div style="display:flex; justify-content:center; padding:3rem;">
            <div class="loading-spinner" style="border: 3px solid #f3f3f3; border-top: 3px solid var(--primary-color); border-radius: 50%; width: 30px; height: 30px; animation: spin 1s linear infinite;"></div>
        </div>
        <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
    `;
    
    try {
        const { collection, getDocs } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
        const usersSnapshot = await getDocs(collection(db, "users"));
        const users = [];
        usersSnapshot.forEach(docSnap => {
            users.push({ id: docSnap.id, ...docSnap.data() });
        });

        if (users.length === 0) {
            contentArea.innerHTML = `<div style="text-align:center; padding:3rem; color:var(--text-muted);">가입한 회원이 없습니다.</div>`;
            return;
        }

        let html = `
            <div style="max-width:800px; margin:0 auto;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem; padding-bottom:0.5rem; border-bottom:2px solid #eee;">
                    <h2 style="font-size:1.1rem; font-weight:900; color:#222;">회원 관리 (${users.length}명)</h2>
                </div>
                <div style="display:flex; flex-direction:column; gap:0.8rem;">
        `;

        users.forEach(u => {
            let roleText = '일반 멤버';
            let roleColor = '#0369a1';
            let roleBg = '#f0f9ff';
            
            if (u.role === 'admin') {
                roleText = '관리자';
                roleColor = '#92400e';
                roleBg = '#fef3c7';
            } else if (u.role === 'banned') {
                roleText = '차단됨';
                roleColor = '#dc2626';
                roleBg = '#fee2e2';
            }

            html += `
                <div style="background:white; border:1px solid #eee; border-radius:6px; padding:1rem; display:flex; justify-content:space-between; align-items:center; transition:0.2s;">
                    <div style="display:flex; flex-direction:column; gap:0.2rem;">
                        <div style="display:flex; align-items:center; gap:0.6rem;">
                            <span style="font-weight:800; font-size:0.95rem; color:#333;">${u.nickname || '이름 없음'}</span>
                            <span style="background:${roleBg}; color:${roleColor}; padding:2px 8px; border-radius:4px; font-size:0.7rem; font-weight:800;">${roleText}</span>
                        </div>
                        <div style="font-size:0.8rem; color:#777;">${u.email || '이메일 정보 없음'}</div>
                    </div>
                    
                    <div style="display:flex; align-items:center; gap:0.5rem;">
                        <select onchange="window.changeUserRole('${u.id}', this.value)" style="padding:0.4rem; border:1px solid #ddd; border-radius:4px; font-size:0.8rem; background:#fafafa; cursor:pointer; outline:none;">
                            <option value="">권한 변경...</option>
                            <option value="member">일반 멤버</option>
                            <option value="admin">관리자 승격</option>
                            <option value="banned">사용 차단</option>
                        </select>
                    </div>
                </div>
            `;
        });

        html += `
                </div>
                <div style="margin-top:2rem; text-align:center; font-size:0.75rem; color:#aaa;">
                    관리 권한을 변경하려면 보안 코드가 필요합니다.
                </div>
            </div>
        `;
        contentArea.innerHTML = html;
    } catch (e) {
        console.error("사용자 목록 불러오기 실패:", e);
        contentArea.innerHTML = `<div style="text-align:center; padding:3rem; color:#dc2626; font-weight:700;">오류: ${e.message}</div>`;
    }
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

initAdminToolbars();

