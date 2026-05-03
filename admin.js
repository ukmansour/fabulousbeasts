import { auth } from './firebase-config.js';
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
        const roleRes = await fetch(`/user/${user.uid}`);
        if (roleRes.ok) {
            const userData = await roleRes.json();
            if (userData.role === 'admin') {
                sessionStorage.setItem(`role_${user.uid}`, 'admin');
                renderAdminPage();
            } else {
                showRecoveryUI();
            }
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
            const res = await fetch('/user/role', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    uid: currentUser.uid,
                    role: 'admin',
                    nickname: currentUser.displayName || "관리자",
                    email: currentUser.email || "",
                    secret: code
                })
            });

            if (!res.ok) throw new Error('권한 수정 실패');
            
            sessionStorage.setItem(`role_${currentUser.uid}`, 'admin');
            alert("관리자 등록 완료!");
            location.reload();
        } catch (e) {
            alert("등록 실패: " + e.message);
        }
    };
}

async function renderAdminPage() {
    // [읽기 최적화] 사용자 전체 목록을 불러오지 않고, 수동 관리 콘솔을 렌더링합니다.
    contentArea.innerHTML = `
        <div style="background:white; padding:2rem; border:1px solid #ddd; border-radius:8px; box-shadow:0 2px 10px rgba(0,0,0,0.05);">
            <h2 style="font-size:1.2rem; margin-bottom:1rem; border-bottom:2px solid var(--primary-color); padding-bottom:0.5rem;">회원 권한 수동 관리</h2>
            <p style="color:#666; font-size:0.9rem; margin-bottom:1.5rem;">대량의 DB 읽기를 방지하기 위해 사용자 목록을 자동으로 표시하지 않습니다.<br>관리가 필요한 사용자의 <strong>UID</strong>를 입력하여 직접 권한을 수정하세요.</p>
            
            <div style="max-width:500px; margin:0 auto; padding:1rem; background:#f8f9fa; border-radius:8px;">
                <label style="display:block; font-weight:bold; margin-bottom:0.5rem; font-size:0.85rem;">관리 대상 사용자 UID</label>
                <input type="text" id="target-uid" placeholder="사용자 UID를 입력하세요" 
                    style="width:100%; padding:0.8rem; border:1px solid #ddd; border-radius:4px; margin-bottom:1.5rem; outline:none; font-family:monospace;">
                
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.5rem;">
                    <button onclick="window.manualChangeRole('admin')" style="padding:0.8rem; background:#fef3c7; color:#92400e; border:1px solid #fcd34d; border-radius:4px; font-weight:bold; cursor:pointer;">관리자로 승격</button>
                    <button onclick="window.manualChangeRole('member')" style="padding:0.8rem; background:#f0f9ff; color:#0369a1; border:1px solid #bae6fd; border-radius:4px; font-weight:bold; cursor:pointer;">일반 멤버로 변경</button>
                    <button onclick="window.manualChangeRole('banned')" style="padding:0.8rem; background:#fee2e2; color:#dc2626; border:1px solid #fecaca; border-radius:4px; font-weight:bold; cursor:pointer; grid-column: span 2; margin-top:0.5rem;">차단하기</button>
                </div>
            </div>
            
            <div style="margin-top:2rem; font-size:0.8rem; color:#999; border-top:1px solid #eee; padding-top:1rem;">
                <p>※ UID는 해당 사용자의 가입 정보에서 확인하거나, 주소창의 세그먼트 등을 통해 알 수 있습니다.</p>
                <p>※ 이 방식은 <strong>수정 시에만 데이터베이스에 접근</strong>하므로 불필요한 읽기 비용을 발생시키지 않습니다.</p>
            </div>
        </div>
    `;
}

window.manualChangeRole = async (newRole) => {
    const uid = document.getElementById('target-uid').value.trim();
    if (!uid) { alert("UID를 입력해주세요."); return; }

    let actionText = '';
    if (newRole === 'admin') actionText = '관리자로 승격';
    else if (newRole === 'banned') actionText = '차단';
    else actionText = '일반 멤버로 변경';

    if (!confirm(`UID [${uid}] 사용자를 ${actionText}하시겠습니까?`)) return;

    const code = prompt("보안 코드를 입력하세요:");
    if (code !== "9889") { alert("보안 코드가 틀렸습니다."); return; }

    try {
        const res = await fetch('/user/role', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                uid: uid,
                role: newRole,
                secret: code
            })
        });

        if (!res.ok) throw new Error('권한 수정 실패');
        
        alert(`${actionText} 완료!`);
        document.getElementById('target-uid').value = ''; // 입력창 비우기
    } catch (e) {
        alert("오류 발생: " + e.message);
    }
};

initAdminToolbars();
