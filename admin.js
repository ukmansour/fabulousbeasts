import { db, auth } from './firebase-config.js';
import { collection, getDocs, doc, getDoc, setDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const contentArea = document.getElementById('admin-content');
let currentUser = null;

onAuthStateChanged(auth, async (user) => {
    if (!user) { location.href = 'auth.html'; return; }
    currentUser = user;

    try {
        const userSnap = await getDoc(doc(db, "users", user.uid));
        if (userSnap.exists() && userSnap.data().role === 'admin') {
            renderAdminPage();
        } else {
            // users 컬렉션에 없거나 권한이 없는 경우 → 보안 코드로 복구 허용
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
            <h2 style="color:#856404;">⚠️ 관리자 권한 복구</h2>
            <p style="margin-top:1rem; color:#555;">데이터베이스에 관리자 정보가 없습니다.<br>보안 코드로 현재 계정을 관리자로 등록할 수 있습니다.</p>
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
        if (code !== "5555") { alert("보안 코드가 틀렸습니다."); return; }

        try {
            await setDoc(doc(db, "users", currentUser.uid), {
                uid: currentUser.uid,
                nickname: currentUser.displayName || "관리자",
                email: currentUser.email || "",
                role: 'admin',
                joinedAt: serverTimestamp(),
                contributionCount: 0
            });
            alert("관리자 등록 완료! 페이지를 새로고침합니다.");
            location.reload();
        } catch (e) {
            alert("등록 실패: " + e.message);
        }
    };
}

async function renderAdminPage() {
    contentArea.innerHTML = `<p style="color:#999; text-align:center; padding:2rem;">사용자 목록 불러오는 중...</p>`;
    await loadAndRenderUsers();
}

async function loadAndRenderUsers() {
    try {
        const snap = await getDocs(collection(db, "users"));
        
        if (snap.empty) {
            contentArea.innerHTML = `
                <div style="text-align:center; padding:2rem; color:#999;">
                    <p>등록된 사용자가 없습니다.</p>
                    <p style="font-size:0.85rem; margin-top:0.5rem;">다른 사용자들이 사이트에 접속하면 자동으로 목록에 추가됩니다.</p>
                    <button onclick="location.reload()" style="margin-top:1rem; padding:0.5rem 1.2rem; cursor:pointer; border:1px solid #ccc; border-radius:4px;">새로고침</button>
                </div>
            `;
            return;
        }

        let users = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        
        // 관리자 먼저, 그 다음 가입일 순 정렬
        users.sort((a, b) => {
            if (a.role === 'admin' && b.role !== 'admin') return -1;
            if (a.role !== 'admin' && b.role === 'admin') return 1;
            const ta = a.joinedAt?.seconds ?? 0;
            const tb = b.joinedAt?.seconds ?? 0;
            return tb - ta;
        });

        let html = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
                <p style="font-size:0.9rem; color:#555;">총 <strong>${users.length}</strong>명의 사용자가 등록되어 있습니다.</p>
                <button onclick="window.refreshUserList()" style="padding:0.4rem 1rem; border:1px solid #ccc; border-radius:4px; cursor:pointer; font-size:0.85rem;">🔄 새로고침</button>
            </div>
            <table class="user-table" style="width:100%; border-collapse:collapse;">
                <thead>
                    <tr style="background:#f5f6f7; border-bottom:2px solid #ddd;">
                        <th style="padding:0.8rem; text-align:left; font-size:0.85rem;">닉네임</th>
                        <th style="padding:0.8rem; text-align:left; font-size:0.85rem;">이메일</th>
                        <th style="padding:0.8rem; text-align:center; font-size:0.85rem;">현재 권한</th>
                        <th style="padding:0.8rem; text-align:center; font-size:0.85rem;">가입일</th>
                        <th style="padding:0.8rem; text-align:center; font-size:0.85rem;">권한 변경</th>
                    </tr>
                </thead>
                <tbody>
        `;

        users.forEach(user => {
            const isMe = user.uid === currentUser.uid;
            const isAdmin = user.role === 'admin';
            const date = user.joinedAt?.seconds
                ? new Date(user.joinedAt.seconds * 1000).toLocaleDateString('ko-KR')
                : '기록 없음';

            const roleBadge = isAdmin
                ? `<span style="background:#fef3c7; color:#92400e; padding:0.2rem 0.6rem; border-radius:20px; font-size:0.8rem; font-weight:700;">👑 관리자</span>`
                : `<span style="background:#f0f9ff; color:#0369a1; padding:0.2rem 0.6rem; border-radius:20px; font-size:0.8rem; font-weight:700;">일반 멤버</span>`;

            let actionBtn = '';
            if (isMe) {
                actionBtn = `<span style="font-size:0.8rem; color:#aaa;">(본인)</span>`;
            } else if (isAdmin) {
                actionBtn = `<button onclick="window.changeRole('${user.id}', 'member')"
                    style="padding:0.35rem 0.8rem; background:white; border:1.5px solid #dc2626; color:#dc2626; border-radius:4px; cursor:pointer; font-weight:700; font-size:0.8rem;">
                    ▼ 멤버로 강등
                </button>`;
            } else {
                actionBtn = `<button onclick="window.changeRole('${user.id}', 'admin')"
                    style="padding:0.35rem 0.8rem; background:#00a0e9; border:none; color:white; border-radius:4px; cursor:pointer; font-weight:700; font-size:0.8rem;">
                    ▲ 관리자 승격
                </button>`;
            }

            html += `
                <tr style="border-bottom:1px solid #eee; ${isMe ? 'background:#f8faff;' : ''}">
                    <td style="padding:0.8rem; font-weight:${isMe ? '800' : '500'};">${user.nickname || '이름 없음'}${isMe ? ' <span style="color:#00a0e9; font-size:0.75rem;">(나)</span>' : ''}</td>
                    <td style="padding:0.8rem; color:#666; font-size:0.85rem;">${user.email || '-'}</td>
                    <td style="padding:0.8rem; text-align:center;">${roleBadge}</td>
                    <td style="padding:0.8rem; text-align:center; color:#999; font-size:0.85rem;">${date}</td>
                    <td style="padding:0.8rem; text-align:center;">${actionBtn}</td>
                </tr>
            `;
        });

        html += `</tbody></table>`;
        contentArea.innerHTML = html;

    } catch (e) {
        console.error("User list load error:", e);
        contentArea.innerHTML = `<p style="color:red; padding:2rem; text-align:center;">오류: ${e.message}</p>`;
    }
}

window.changeRole = async (uid, newRole) => {
    const actionText = newRole === 'admin' ? '관리자로 승격' : '일반 멤버로 강등';
    const code = prompt(`${actionText}하시겠습니까?\n보안 코드를 입력하세요:`);
    if (code === null) return;
    if (code !== "5555") { alert("보안 코드가 틀렸습니다."); return; }

    try {
        await updateDoc(doc(db, "users", uid), { role: newRole });
        alert(`✅ ${actionText} 완료!`);
        await loadAndRenderUsers(); // 즉시 갱신
    } catch (e) {
        alert("오류 발생: " + e.message);
    }
};

window.refreshUserList = async () => {
    contentArea.innerHTML = `<p style="color:#999; text-align:center; padding:2rem;">새로고침 중...</p>`;
    await loadAndRenderUsers();
};

// ─── 공지사항 관련 ───────────────────────────────────────────

// 공지 탭으로 전환할 때 기존 공지 내용 자동 불러오기
window.switchTab = (tab) => {
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    
    const panel = document.getElementById('tab-' + tab);
    const btn = document.getElementById('tab-btn-' + tab);
    
    if (panel) panel.classList.add('active');
    if (btn) btn.classList.add('active');

    // 공지 탭으로 이동 시 데이터 로드
    if (tab === 'notice') {
        loadNotice();
    }
};

async function loadNotice() {
    const textarea = document.getElementById('notice-content');
    if (!textarea) return;
    
    try {
        const snap = await getDoc(doc(db, "notices", "main"));
        if (snap.exists()) {
            textarea.value = snap.data().content || '';
            console.log("Notice loaded from Firestore");
        }
    } catch (e) {
        console.error("공지 불러오기 실패:", e);
    }
}

window.saveNotice = async () => {
    const textarea = document.getElementById('notice-content');
    const status = document.getElementById('notice-status');
    if (!textarea || !status) return;

    const content = textarea.value.trim();
    if (!content) {
        alert("공지 내용을 입력해주세요.");
        return;
    }

    status.textContent = '데이터베이스에 저장 중...';
    status.style.color = '#666';

    try {
        console.log("Saving notice to Firestore...");
        await setDoc(doc(db, "notices", "main"), {
            content: content,
            updatedAt: serverTimestamp(),
            updatedBy: currentUser?.displayName || currentUser?.email || '관리자'
        });
        
        status.textContent = '✅ 공지가 성공적으로 저장되었습니다!';
        status.style.color = 'green';
        alert("공지가 저장되었습니다.");
        setTimeout(() => { status.textContent = ''; }, 3000);
    } catch (e) {
        console.error("Notice save error:", e);
        status.textContent = '❌ 저장 실패: ' + e.message;
        status.style.color = 'red';
        
        if (e.code === 'permission-denied') {
            alert("권한이 거부되었습니다. 관리자 권한이 있는지 확인해주세요.");
        } else {
            alert("저장 중 오류가 발생했습니다: " + e.message);
        }
    }
};
