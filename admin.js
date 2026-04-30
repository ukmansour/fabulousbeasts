import { db, auth } from './firebase-config.js';
import { collection, getDocs, doc, getDoc, updateDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
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

async function loadUserList() {
    try {
        console.log("Fetching all users...");
        const snap = await getDocs(collection(db, "users"));
        console.log("Total users found in Firestore:", snap.size);
        
        let users = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Firestore 쿼리 필터링으로 인한 누락 방지를 위해 자바스크립트에서 정렬
        users.sort((a, b) => (a.nickname || "").localeCompare(b.nickname || ""));
        
        renderUserTable(users);
    } catch (e) {
        console.error("User list fetch error:", e);
        contentArea.innerHTML = `<p style="color:red;">목록을 불러오지 못했습니다: ${e.message}</p>`;
    }
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
