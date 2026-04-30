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
        const q = query(collection(db, "users"), orderBy("nickname", "asc"));
        const snap = await getDocs(q);
        const users = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        renderUserTable(users);
    } catch (e) {
        contentArea.innerHTML = `<p style="color:red;">목록을 불러오지 못했습니다: ${e.message}</p>`;
    }
}

function renderUserTable(users) {
    let html = `
        <table class="user-table">
            <thead>
                <tr>
                    <th>닉네임</th>
                    <th>이메일</th>
                    <th>권한</th>
                    <th>가입일</th>
                    <th>작업</th>
                </tr>
            </thead>
            <tbody>
    `;

    html += users.map(user => {
        const date = user.joinedAt?.seconds ? new Date(user.joinedAt.seconds * 1000) : new Date(user.joinedAt);
        const roleClass = user.role === 'admin' ? 'role-admin' : 'role-member';
        const roleLabel = user.role === 'admin' ? '관리자' : '일반 멤버';
        const toggleLabel = user.role === 'admin' ? '멤버로 강등' : '관리자로 승격';

        return `
            <tr>
                <td><strong>${user.nickname}</strong></td>
                <td style="color:#666; font-size:0.9rem;">${user.realEmail || '-'}</td>
                <td><span class="role-badge ${roleClass}">${roleLabel}</span></td>
                <td style="color:#666; font-size:0.85rem;">${isNaN(date) ? '-' : date.toLocaleDateString()}</td>
                <td>
                    ${user.uid === currentUser.uid ? 
                        '<span style="font-size:0.8rem; color:#999;">본인</span>' : 
                        `<button class="toggle-btn" onclick="window.toggleUserRole('${user.id}', '${user.role}')">${toggleLabel}</button>`
                    }
                </td>
            </tr>
        `;
    }).join('');

    html += `</tbody></table>`;
    contentArea.innerHTML = html;
}

window.toggleUserRole = async (uid, currentRole) => {
    const newRole = currentRole === 'admin' ? 'member' : 'admin';
    
    const actionText = newRole === 'admin' ? '승격' : '강등';
    const password = prompt(`관리자 권한을 ${actionText}하시겠습니까? 비밀번호를 입력하세요:`);
    
    if (password !== "5555") {
        alert("비밀번호가 일치하지 않거나 취소되었습니다.");
        return;
    }
    
    try {
        await updateDoc(doc(db, "users", uid), { role: newRole });
        alert("권한이 변경되었습니다.");
        loadUserList();
    } catch (e) {
        alert("변경 실패: " + e.message);
    }
};
