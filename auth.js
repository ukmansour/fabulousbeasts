import { auth, db } from './firebase-config.js';
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword,
    updateProfile,
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    doc, 
    setDoc, 
    getDoc, 
    collection, 
    query, 
    where, 
    getDocs,
    limit,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const authForm = document.getElementById('auth-form');
const nicknameInput = document.getElementById('nickname');
const emailInput = document.getElementById('email');
const emailGroup = document.getElementById('email-group');
const passwordInput = document.getElementById('password');
const passwordConfirmInput = document.getElementById('password-confirm');
const submitBtn = document.getElementById('submit-btn');
const loginTab = document.getElementById('login-tab');
const signupTab = document.getElementById('signup-tab');
const errorMessage = document.getElementById('error-message');

let isLogin = true;
const INTERNAL_DOMAIN = "@youshouyan.wiki"; // 이 사이트만의 전용 도메인

// 탭 전환 로직
loginTab.addEventListener('click', () => {
    isLogin = true;
    loginTab.classList.add('active');
    signupTab.classList.remove('active');
    submitBtn.textContent = '로그인';
    emailGroup.style.display = 'none';
    passwordConfirmInput.style.display = 'none';
    nicknameInput.placeholder = "닉네임";
    errorMessage.style.display = 'none';
});

signupTab.addEventListener('click', () => {
    isLogin = false;
    signupTab.classList.add('active');
    loginTab.classList.remove('active');
    submitBtn.textContent = '멤버 가입';
    emailGroup.style.display = 'flex';
    passwordConfirmInput.style.display = 'block';
    nicknameInput.placeholder = "사용할 닉네임 (중복 불가)";
    errorMessage.style.display = 'none';
});

// 닉네임 중복 체크 함수
async function isNicknameTaken(nickname) {
    const q = query(collection(db, "users"), where("nickname", "==", nickname));
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
}

authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const nickname = nicknameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const passwordConfirm = passwordConfirmInput.value;
    
    errorMessage.style.display = 'none';
    submitBtn.disabled = true;
    submitBtn.textContent = '처리 중...';

    try {
        if (isLogin) {
            // [로그인 로직]
            // 닉네임으로 가입했으므로 내부 도메인을 붙여서 인증
            const loginEmail = nickname.includes('@') ? nickname : nickname + INTERNAL_DOMAIN;
            await signInWithEmailAndPassword(auth, loginEmail, password);
            window.location.href = 'index.html';
        } else {
            // [회원가입 로직]
            if (password !== passwordConfirm) throw new Error("비밀번호 확인이 일치하지 않습니다.");
            if (password.length < 6) throw new Error("비밀번호는 6자리 이상이어야 합니다.");
            
            // 1. 닉네임 중복 체크
            const taken = await isNicknameTaken(nickname);
            if (taken) throw new Error("이미 존재하는 닉네임입니다. 다른 이름을 사용해 주세요.");

            // 2. 계정 생성
            const signupEmail = email || (nickname + INTERNAL_DOMAIN);
            const userCredential = await createUserWithEmailAndPassword(auth, signupEmail, password);
            const user = userCredential.user;

            // 3. Firebase Auth 프로필 업데이트
            await updateProfile(user, { displayName: nickname });

            // 4. Firestore 및 Cloudflare D1 데이터베이스에 유저 정보 동기화 (동시 진행)
            try {
                await Promise.all([
                    // Firestore 저장
                    setDoc(doc(db, "users", user.uid), {
                        uid: user.uid,
                        nickname: nickname,
                        email: signupEmail,
                        role: 'member',
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp()
                    }),
                    // Cloudflare D1 저장 (관리자 탭 표시용)
                    fetch('/api/user/role', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            uid: user.uid,
                            nickname: nickname,
                            email: signupEmail,
                            role: 'member',
                            secret: '9889'
                        })
                    })
                ]);
                console.log("User successfully synchronized to Firestore and D1.");
            } catch (syncError) {
                console.error("Synchronization failed:", syncError);
                // 한쪽이 실패하더라도 일단 가입은 된 상태이므로 진행하거나 에러를 알림
            }

            console.log("User successfully created in Auth, Firestore, and D1.");
            alert(`${nickname}님, 가입이 완료되었습니다!`);

            window.location.href = 'index.html';
        }
    } catch (error) {
        console.error(error);
        errorMessage.textContent = error.message;
        errorMessage.style.display = 'block';
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = isLogin ? '로그인' : '멤버 가입';
    }
});

onAuthStateChanged(auth, (user) => {
    if (user && !window.location.hash.includes('logout')) {
        window.location.href = 'index.html';
    }
});
