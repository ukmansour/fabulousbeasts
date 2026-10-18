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
    } else if (tabId === 'order') {
        renderOrderAdminPage();
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
                    <!-- 아바타 이미지 -->
                    <div style="width: 48px; height: 48px; border-radius: 50%; overflow: hidden; border: 2px solid #ddd; flex-shrink: 0; background: #f0f0f0; display: flex; align-items: center; justify-content: center; cursor: pointer;" onclick="window.changeUserAvatar('${u.uid}', '${displayName}')">
                        ${u.avatar ? `<img src="${u.avatar}" style="width: 100%; height: 100%; object-fit: cover;">` : `<span style="font-size: 1.5rem; color: #999;">👤</span>`}
                    </div>
                    
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

// [추가] 유저 아바타 변경 함수
window.changeUserAvatar = async (uid, displayName) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        // 파일 크기 체크 (2MB 제한)
        if (file.size > 2 * 1024 * 1024) {
            alert('이미지 크기는 2MB 이하여야 합니다.');
            return;
        }
        
        const code = prompt(`${displayName}의 프로필 사진을 변경하시겠습니까?\n\n보안 코드를 입력하세요:`);
        if (code !== "9889") { 
            alert("보안 코드가 틀렸습니다."); 
            return; 
        }
        
        try {
            // 이미지 업로드
            const formData = new FormData();
            formData.append('file', file);
            formData.append('folder', 'avatars');
            
            const uploadRes = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });
            
            if (!uploadRes.ok) throw new Error('이미지 업로드 실패');
            
            const uploadData = await uploadRes.json();
            const avatarUrl = uploadData.url;
            
            // Firestore 업데이트
            const userRef = doc(db, "users", uid);
            await updateDoc(userRef, {
                avatar: avatarUrl,
                updatedAt: serverTimestamp()
            });
            
            // D1에서 기존 유저 정보 가져오기
            const userInfoRes = await fetch(`/api/user/${uid}`);
            let role = 'member';
            let name = displayName;
            let email = '';
            
            if (userInfoRes.ok) {
                const userInfo = await userInfoRes.json();
                role = userInfo.role || 'member';
                name = userInfo.name || displayName;
                email = userInfo.email || '';
            }
            
            // D1 동기화
            const res = await fetch('/api/user/role', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    uid, 
                    role: role,
                    name: name,
                    nickname: name,
                    email: email,
                    isBanned: false,
                    avatar: avatarUrl,
                    secret: code 
                })
            });
            
            if (!res.ok) {
                const errorData = await res.json();
                console.error('D1 동기화 실패:', errorData);
                throw new Error('D1 동기화 실패: ' + (errorData.error || '알 수 없는 오류'));
            }
            
            alert(`${displayName}의 프로필 사진이 변경되었습니다!`);
            // onSnapshot이 실시간으로 화면을 갱신
        } catch (e) {
            console.error(e);
            alert("프로필 사진 변경 실패: " + e.message);
        }
    };
    
    input.click();
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

// [추가] 순서 관리 탭 렌더링
let allDocuments = [];
let categoryOrders = {};
let characterOrders = {};

async function renderOrderAdminPage() {
    const orderArea = document.getElementById('order-admin-content');
    if (!orderArea) return;

    orderArea.innerHTML = '<div style="text-align:center; padding:2rem;">데이터를 불러오는 중...</div>';

    try {
        // 모든 문서 로드
        const response = await fetch('/api/images');
        allDocuments = await response.json();
        
        // 순서 정보 로드
        const orderResponse = await fetch('/api/order');
        if (orderResponse.ok) {
            const orderData = await orderResponse.json();
            categoryOrders = orderData.categoryOrders || {};
            characterOrders = orderData.characterOrders || {};
        }

        orderArea.innerHTML = `
            <div style="max-width:1200px; margin:0 auto; display:grid; grid-template-columns:1fr 1fr; gap:2rem;">
                <!-- 카테고리 순서 -->
                <div style="background:white; border:1px solid #ccc; padding:1.5rem;">
                    <h3 style="font-weight:900; margin-bottom:0.5rem; font-size:1.1rem;">카테고리 순서</h3>
                    <p style="color:#666; font-size:0.85rem; margin-bottom:1.5rem;">드래그하여 홈페이지에 표시될 카테고리 순서를 변경하세요</p>
                    <ul id="admin-category-list" style="list-style:none; padding:0; margin:0 0 1.5rem 0; min-height:300px;">
                    </ul>
                    <button id="save-category-order" style="width:100%; padding:0.8rem; background:#333; color:white; border:none; font-weight:900; cursor:pointer;">카테고리 순서 저장</button>
                    <div id="category-status" style="margin-top:1rem; padding:0.8rem; border-radius:4px; display:none;"></div>
                </div>
                
                <!-- 캐릭터 순서 -->
                <div style="background:white; border:1px solid #ccc; padding:1.5rem;">
                    <h3 style="font-weight:900; margin-bottom:0.5rem; font-size:1.1rem;">캐릭터 순서</h3>
                    <p style="color:#666; font-size:0.85rem; margin-bottom:1rem;">
                        카테고리 선택: 
                        <select id="admin-category-selector" style="padding:0.4rem; border:1px solid #ccc; margin-left:0.5rem;">
                            <option value="">선택...</option>
                        </select>
                    </p>
                    <ul id="admin-character-list" style="list-style:none; padding:0; margin:0 0 1.5rem 0; min-height:300px;">
                        <li style="text-align:center; color:#868e96; padding:2rem;">카테고리를 선택하세요</li>
                    </ul>
                    <button id="save-character-order" style="width:100%; padding:0.8rem; background:#333; color:white; border:none; font-weight:900; cursor:pointer; display:none;">캐릭터 순서 저장</button>
                    <div id="character-status" style="margin-top:1rem; padding:0.8rem; border-radius:4px; display:none;"></div>
                </div>
            </div>
            
            <style>
                .admin-draggable-item {
                    background:#f8f9fa;
                    border:2px solid #dee2e6;
                    border-radius:4px;
                    padding:0.8rem;
                    margin-bottom:0.5rem;
                    cursor:move;
                    display:flex;
                    justify-content:space-between;
                    align-items:center;
                    transition:0.2s;
                }
                .admin-draggable-item:hover { background:#e9ecef; border-color:#adb5bd; }
                .admin-drag-handle { cursor:grab; font-size:1.2rem; color:#868e96; margin-right:0.5rem; }
                .admin-drag-handle:active { cursor:grabbing; }
                .admin-item-order { 
                    background:#333; 
                    color:white; 
                    padding:0.2rem 0.5rem; 
                    border-radius:3px; 
                    font-size:0.8rem;
                    font-weight:bold;
                    min-width:25px;
                    text-align:center;
                }
            </style>
        `;

        renderAdminCategoryList();
        setupAdminCategorySelector();

        // 저장 버튼 이벤트
        document.getElementById('save-category-order').onclick = saveCategoryOrder;
        document.getElementById('save-character-order').onclick = saveCharacterOrder;

    } catch (e) {
        orderArea.innerHTML = `<div style="text-align:center; padding:2rem; color:red;">오류: ${e.message}</div>`;
    }
}

function renderAdminCategoryList() {
    const categoryList = document.getElementById('admin-category-list');
    if (!categoryList) return;

    const categories = [...new Set(allDocuments.map(doc => doc.category).filter(c => c))];
    const sortedCategories = categories.sort((a, b) => {
        const orderA = categoryOrders[a] !== undefined ? categoryOrders[a] : 999;
        const orderB = categoryOrders[b] !== undefined ? categoryOrders[b] : 999;
        return orderA - orderB;
    });

    categoryList.innerHTML = sortedCategories.map((category, index) => {
        const count = allDocuments.filter(doc => doc.category === category).length;
        return `
            <li class="admin-draggable-item" data-category="${category}" draggable="true">
                <div style="display:flex; align-items:center; gap:0.5rem; flex:1;">
                    <span class="admin-drag-handle">☰</span>
                    <span class="admin-item-order">${index + 1}</span>
                    <span style="font-weight:700;">${category}</span>
                    <span style="font-size:0.85rem; color:#868e96;">(${count}개)</span>
                </div>
            </li>
        `;
    }).join('');

    setupAdminDragAndDrop('admin-category-list');
}

function setupAdminCategorySelector() {
    const selector = document.getElementById('admin-category-selector');
    if (!selector) return;

    const categories = [...new Set(allDocuments.map(doc => doc.category).filter(c => c))];
    const sortedCategories = categories.sort((a, b) => {
        const orderA = categoryOrders[a] !== undefined ? categoryOrders[a] : 999;
        const orderB = categoryOrders[b] !== undefined ? categoryOrders[b] : 999;
        return orderA - orderB;
    });

    selector.innerHTML = '<option value="">선택...</option>' + 
        sortedCategories.map(cat => `<option value="${cat}">${cat}</option>`).join('');

    selector.onchange = (e) => {
        if (e.target.value) {
            renderAdminCharacterList(e.target.value);
        } else {
            document.getElementById('admin-character-list').innerHTML = '<li style="text-align:center; color:#868e96; padding:2rem;">카테고리를 선택하세요</li>';
            document.getElementById('save-character-order').style.display = 'none';
        }
    };
}

function renderAdminCharacterList(category) {
    const characterList = document.getElementById('admin-character-list');
    const saveBtn = document.getElementById('save-character-order');
    if (!characterList) return;

    const characters = allDocuments.filter(doc => doc.category === category);
    
    if (characters.length === 0) {
        characterList.innerHTML = '<li style="text-align:center; color:#868e96; padding:2rem;">이 카테고리에 캐릭터가 없습니다</li>';
        saveBtn.style.display = 'none';
        return;
    }

    const orders = characterOrders[category] || {};
    const sortedCharacters = characters.sort((a, b) => {
        const orderA = orders[a.title] !== undefined ? orders[a.title] : 999;
        const orderB = orders[b.title] !== undefined ? orders[b.title] : 999;
        return orderA - orderB;
    });

    characterList.innerHTML = sortedCharacters.map((char, index) => `
        <li class="admin-draggable-item" data-title="${char.title}" data-category="${category}" draggable="true">
            <div style="display:flex; align-items:center; gap:0.5rem; flex:1;">
                <span class="admin-drag-handle">☰</span>
                <span class="admin-item-order">${index + 1}</span>
                <span style="font-weight:700;">${char.name || char.title}</span>
            </div>
        </li>
    `).join('');

    saveBtn.style.display = 'block';
    setupAdminDragAndDrop('admin-character-list');
}

function setupAdminDragAndDrop(listId) {
    const list = document.getElementById(listId);
    if (!list) return;

    let draggedElement = null;
    const items = list.querySelectorAll('.admin-draggable-item');

    items.forEach(item => {
        item.ondragstart = function(e) {
            draggedElement = this;
            this.style.opacity = '0.5';
            e.dataTransfer.effectAllowed = 'move';
        };

        item.ondragend = function() {
            this.style.opacity = '1';
            updateAdminOrderNumbers(listId);
        };

        item.ondragover = function(e) {
            e.preventDefault();
            return false;
        };

        item.ondrop = function(e) {
            e.stopPropagation();
            
            if (draggedElement !== this) {
                const allItems = Array.from(list.querySelectorAll('.admin-draggable-item'));
                const draggedIndex = allItems.indexOf(draggedElement);
                const targetIndex = allItems.indexOf(this);

                if (draggedIndex < targetIndex) {
                    this.parentNode.insertBefore(draggedElement, this.nextSibling);
                } else {
                    this.parentNode.insertBefore(draggedElement, this);
                }
            }
            return false;
        };
    });

    updateAdminOrderNumbers(listId);
}

function updateAdminOrderNumbers(listId) {
    const items = document.querySelectorAll(`#${listId} .admin-draggable-item`);
    items.forEach((item, index) => {
        const orderSpan = item.querySelector('.admin-item-order');
        if (orderSpan) orderSpan.textContent = index + 1;
    });
}

async function saveCategoryOrder() {
    const items = document.querySelectorAll('#admin-category-list .admin-draggable-item');
    const newOrders = {};

    items.forEach((item, index) => {
        const category = item.dataset.category;
        newOrders[category] = index;
    });

    const secret = prompt("보안 코드를 입력하세요:");
    if (secret !== "9889") {
        alert("보안 코드가 틀렸습니다.");
        return;
    }

    try {
        const response = await fetch('/api/order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'category',
                orders: newOrders,
                secret: secret
            })
        });

        if (response.ok) {
            categoryOrders = newOrders;
            showAdminStatus('category-status', '카테고리 순서가 저장되었습니다!', 'success');
            setupAdminCategorySelector();
        } else {
            throw new Error('저장 실패');
        }
    } catch (e) {
        showAdminStatus('category-status', '저장에 실패했습니다: ' + e.message, 'error');
    }
}

async function saveCharacterOrder() {
    const categorySelector = document.getElementById('admin-category-selector');
    const category = categorySelector.value;

    if (!category) return;

    const items = document.querySelectorAll('#admin-character-list .admin-draggable-item');
    const newOrders = {};

    items.forEach((item, index) => {
        const title = item.dataset.title;
        newOrders[title] = index;
    });

    const secret = prompt("보안 코드를 입력하세요:");
    if (secret !== "9889") {
        alert("보안 코드가 틀렸습니다.");
        return;
    }

    try {
        const response = await fetch('/api/order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'character',
                category: category,
                orders: newOrders,
                secret: secret
            })
        });

        if (response.ok) {
            if (!characterOrders[category]) characterOrders[category] = {};
            characterOrders[category] = newOrders;
            showAdminStatus('character-status', `"${category}" 카테고리의 캐릭터 순서가 저장되었습니다!`, 'success');
        } else {
            throw new Error('저장 실패');
        }
    } catch (e) {
        showAdminStatus('character-status', '저장에 실패했습니다: ' + e.message, 'error');
    }
}

function showAdminStatus(elementId, message, type) {
    const statusEl = document.getElementById(elementId);
    if (!statusEl) return;
    
    statusEl.textContent = message;
    statusEl.style.display = 'block';
    statusEl.style.background = type === 'success' ? '#d3f9d8' : '#ffe3e3';
    statusEl.style.color = type === 'success' ? '#2b8a3e' : '#c92a2a';

    setTimeout(() => {
        statusEl.style.display = 'none';
    }, 3000);
}
