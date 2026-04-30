import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, updateDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const status = document.getElementById('status');
const actionBtn = document.getElementById('action-btn');

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        status.innerHTML = '<p style="color:red;">로그인이 필요합니다. <a href="auth.html">로그인 페이지로 이동</a></p>';
        actionBtn.disabled = true;
        return;
    }

    status.innerHTML = `<p>현재 로그인: <strong>${user.displayName}</strong> (${user.uid})</p>`;
    
    actionBtn.onclick = async () => {
        const password = prompt("초기 관리자 설정을 위해 비밀번호를 입력하세요:");
        if (password !== "5555") {
            alert("비밀번호가 올바르지 않습니다.");
            return;
        }

        actionBtn.disabled = true;
        status.innerHTML += '<p>권한 업데이트 중...</p>';
        
        try {
            const userRef = doc(db, "users", user.uid);
            const snap = await getDoc(userRef);
            
            if (!snap.exists()) {
                // 문서가 없다면 새로 생성 (회원가입 로직과 동일하게)
                await setDoc(userRef, {
                    uid: user.uid,
                    nickname: user.displayName,
                    role: 'admin',
                    joinedAt: new Date(),
                    contributionCount: 0
                });
            } else {
                // 이미 있다면 role만 업데이트
                await updateDoc(userRef, { role: 'admin' });
            }
            
            status.innerHTML = '<h2 style="color:green;">🎉 성공적으로 관리자로 승격되었습니다!</h2><p>이제 모든 관리 기능을 사용하실 수 있습니다. 이 페이지(setup-admin.html)는 보안을 위해 삭제해 주세요.</p>';
            status.innerHTML += '<br><a href="index.html" class="btn-save" style="text-decoration:none;">홈으로 가기</a>';
        } catch (e) {
            status.innerHTML += `<p style="color:red;">에러 발생: ${e.message}</p>`;
            actionBtn.disabled = false;
        }
    };
});
