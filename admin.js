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
    contentArea.innerHTML = `<div style="text-align:center; padding:2rem;">회원 목록을 불러오는 중...</div>`;
    
    try {
        const { collection, getDocs } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
        const usersSnapshot = await getDocs(collection(db, "users"));
        const users = [];
        usersSnapshot.forEach(docSnap => {
            users.push({ id: docSnap.id, ...docSnap.data() });
        });

        if (users.length === 0) {
            contentArea.innerHTML = `<div style="text-align:center; padding:2rem;">가입한 회원이 없습니다.</div>`;
            return;
        }

        let html = `
            <div style="background:white; padding:2rem; border:1px solid #ddd; border-radius:8px; box-shadow:0 2px 10px rgba(0,0,0,0.05);">
                <h2 style="font-size:1.2rem; margin-bottom:1rem; border-bottom:2px solid var(--primary-color); padding-bottom:0.5rem;">회원 관리</h2>
                <div style="overflow-x:auto;">
                    <table style="width:100%; border-collapse:collapse; text-align:left;">
                        <thead>
                            <tr style="background:#f8f9fa; border-bottom:2px solid #ddd;">
                                <th style="padding:12px 10px; font-weight:800; color:#333;">닉네임</th>
                                <th style="padding:12px 10px; font-weight:800; color:#333;">이메일</th>
                                <th style="padding:12px 10px; font-weight:800; color:#333;">현재 권한</th>
                                <th style="padding:12px 10px; font-weight:800; color:#333;">상태 변경</th>
                            </tr>
                        </thead>
                        <tbody>
        `;

        users.forEach(u => {
            let roleBadge = '';
            if (u.role === 'admin') roleBadge = '<span style="background:#fef3c7; color:#92400e; padding:4px 10px; border-radius:20px; font-size:0.8rem; font-weight:bold;">관리자</span>';
            else if (u.role === 'banned') roleBadge = '<span style="background:#fee2e2; color:#dc2626; padding:4px 10px; border-radius:20px; font-size:0.8rem; font-weight:bold;">차단됨</span>';
            else roleBadge = '<span style="background:#f0f9ff; color:#0369a1; padding:4px 10px; border-radius:20px; font-size:0.8rem; font-weight:bold;">일반 멤버</span>';

            html += `
                <tr style="border-bottom:1px solid #eee;">
                    <td style="padding:12px 10px;">${u.nickname || '이름 없음'}</td>
                    <td style="padding:12px 10px;">${u.email || '-'}</td>
                    <td style="padding:12px 10px;">${roleBadge}</td>
                    <td style="padding:12px 10px;">
                        <select onchange="window.changeUserRole('${u.id}', this.value)" style="padding:6px; border:1px solid #ccc; border-radius:4px; font-size:0.85rem; outline:none; cursor:pointer;">
                            <option value="">변경 선택...</option>
                            <option value="member">일반 멤버로 강등</option>
                            <option value="admin">관리자로 승격</option>
                            <option value="banned">차단하기 (접근 금지)</option>
                        </select>
                    </td>
                </tr>
            `;
        });

        html += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        contentArea.innerHTML = html;
    } catch (e) {
        console.error("사용자 목록 불러오기 실패:", e);
        contentArea.innerHTML = `<div style="text-align:center; padding:2rem; color:red;">사용자 목록을 불러오는 중 오류가 발생했습니다: ${e.message}</div>`;
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
        const userRef = doc(db, "users", uid);
        await setDoc(userRef, { 
            role: newRole,
            updatedAt: serverTimestamp()
        }, { merge: true });
        
        alert(`${actionText} 완료!`);
        renderAdminPage(); // 성공 시 새로고침
    } catch (e) {
        alert("오류 발생: " + e.message);
        renderAdminPage();
    }
};

initAdminToolbars();

