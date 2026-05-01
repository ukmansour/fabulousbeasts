import { db, auth } from './firebase-config.js';
import { collection, getDocs, doc, getDoc, updateDoc, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const contentArea = document.getElementById('admin-content');
let currentUser = null;
let userRole = 'member';

onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    if (user) {
        try {
            const userSnap = await getDoc(doc(db, "users", user.uid));
            if (userSnap.exists()) {
                userRole = userSnap.data().role || 'member';
                if (userRole !== 'admin') {
                    alert("접근 권한이 없습니다.");
                    location.href = 'index.html';
                    return;
                }
                loadUserList();
            } else {
                location.href = 'index.html';
            }
        } catch (e) { 
            console.error(e);
            location.href = 'index.html';
        }
    } else {
        location.href = 'auth.html';
    }
});

function loadUserList() {
    console.log("Starting real-time user list listener...");
    const userCol = collection(db, "users");
    
    onSnapshot(userCol, (snap) => {
        if (snap.empty) {
            contentArea.innerHTML = `
                <div style="text-align:center; padding:3rem; background:#fffbe6; border:1px solid #ffe58f; border-radius:8px;">
                    <h2 style="color:#856404; margin-bottom:1rem;">⚠️ 명단이 비어있습니다</h2>
                    <p>데이터베이스에 등록된 사용자가 없습니다.</p>
                    <p style="font-size:0.9rem; color:#666; margin-top:0.5rem;">현재 접속 중인 계정을 관리자로 즉시 등록하시겠습니까?</p>
                    <button id="force-init-btn" style="margin-top:1.5rem; padding:0.8rem 1.5rem; background:#00a0e9; color:white; border:none; border-radius:4px; font-weight:bold; cursor:pointer;">내 계정을 관리자로 강제 등록</button>
                </div>
            `;
            
            const btn = document.getElementById('force-init-btn');
            if (btn) {
                btn.onclick = async () => {
                    const pw = prompt("관리자 등록을 위해 보안 코드(5555)를 입력하세요:");
                    if (pw !== "5555") return alert("코드가 틀렸습니다.");
                    
                    try {
                        const user = auth.currentUser;
                        if (!user) return alert("로그인 정보가 없습니다.");
                        
                        await setDoc(doc(db, "users", user.uid), {
                            uid: user.uid,
                            nickname: user.displayName || "관리자",
                            role: 'admin',
                            joinedAt: serverTimestamp(),
                            contributionCount: 0
                        });
                        alert("관리자 등록 성공! 페이지를 새로고침합니다.");
                        location.reload();
                    } catch (e) {
                        alert("등록 실패: " + e.message);
                    }
                };
            }
            return;
        }

        console.log("User data snapshot received. Count:", snap.size);
        let users = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // 가입일 순으로 정렬 (최신 가입자가 위로)
        users.sort((a, b) => {
            const dateA = a.joinedAt?.seconds ? a.joinedAt.seconds * 1000 : new Date(a.joinedAt).getTime();
            const dateB = b.joinedAt?.seconds ? b.joinedAt.seconds * 1000 : new Date(b.joinedAt).getTime();
            return (dateB || 0) - (dateA || 0);
        });
        
        renderUserTable(users);
    }, (e) => {
        console.error("User list real-time error:", e);
        contentArea.innerHTML = `<p style="color:red;">목록을 실시간으로 불러오지 못했습니다: ${e.message}</p>`;
    });
}

function renderUserTable(users) {
    if (users.length === 0) {
        contentArea.innerHTML = `<p style="text-align:center; padding:2rem; color:#999;">가입된 회원이 없습니다.</p>`;
        return;
    }

    let html = `
        <p style="font-size:0.9rem; color:#666; margin-bottom:1rem;">총 가입 멤버: <strong>${users.length}</strong>명</p>
        <table class="user-table">
            <thead>
                <tr>
                    <th>닉네임</th>
                    <th>이메일</th>
                    <th>현재 권한</th>
                    <th>가입일</th>
                    <th>권한 관리</th>
                </tr>
            </thead>
            <tbody>
    `;

    html += users.map(user => {
        const date = user.joinedAt?.seconds ? new Date(user.joinedAt.seconds * 1000) : new Date(user.joinedAt);
        const roleClass = user.role === 'admin' ? 'role-admin' : 'role-member';
        const roleLabel = user.role === 'admin' ? '관리자' : '일반 멤버';
        
        const toggleLabel = user.role === 'admin' ? '관리자 해제' : '관리자 지정';
        const btnStyle = user.role === 'admin' ? 'border-color: #dc2626; color: #dc2626;' : 'border-color: #00a0e9; color: #00a0e9;';

        return `
            <tr>
                <td><strong>${user.nickname}</strong></td>
                <td style="color:#666; font-size:0.9rem;">${user.realEmail || '-'}</td>
                <td><span class="role-badge ${roleClass}">${roleLabel}</span></td>
                <td style="color:#666; font-size:0.85rem;">${isNaN(date) ? '-' : date.toLocaleDateString()}</td>
                <td>
                    ${user.uid === currentUser.uid ? 
                        '<span style="font-size:0.8rem; color:#999;">(나)</span>' : 
                        `<button class="toggle-btn" style="${btnStyle}" onclick="window.toggleUserRole('${user.id}', '${user.role}')">${toggleLabel}</button>`
                    }
                </td>
            </tr>
        `;
    }).join('');

    html += `</tbody></table>`;
    contentArea.innerHTML = html;
}

window.toggleUserRole = async (uid, currentRole) => {
    const isDemote = currentRole === 'admin';
    const actionText = isDemote ? '관리자 권한을 해제' : '관리자로 임명';
    
    // 비밀번호는 노출하지 않고 입력만 받음
    const password = prompt(`${actionText}하시겠습니까?\n계속하려면 전용 보안 코드를 입력하세요:`);
    
    if (password === null) return;
    
    if (password !== "5555") {
        alert("보안 코드가 일치하지 않습니다.");
        return;
    }
    
    const newRole = isDemote ? 'member' : 'admin';
    
    try {
        await updateDoc(doc(db, "users", uid), { role: newRole });
        alert("성공적으로 처리되었습니다.");
        loadUserList();
    } catch (e) {
        alert("오류 발생: " + e.message);
    }
};
