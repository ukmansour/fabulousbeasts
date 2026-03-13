import { auth } from './firebase-config.js';
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword,
    updateProfile,
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

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

// 내부적으로 사용할 도메인 (이메일 미입력 시)
const INTERNAL_DOMAIN = "@users.fbwiki.internal";

loginTab.addEventListener('click', () => {
    isLogin = true;
    loginTab.classList.add('active');
    signupTab.classList.remove('active');
    submitBtn.textContent = '로그인';
    emailGroup.style.display = 'none';
    passwordConfirmInput.style.display = 'none';
    nicknameInput.placeholder = "닉네임 (또는 이메일)";
    errorMessage.style.display = 'none';
});

signupTab.addEventListener('click', () => {
    isLogin = false;
    signupTab.classList.add('active');
    loginTab.classList.remove('active');
    submitBtn.textContent = '회원가입';
    emailGroup.style.display = 'flex';
    passwordConfirmInput.style.display = 'block';
    passwordConfirmInput.required = true;
    nicknameInput.placeholder = "사용할 닉네임 (필수)";
    errorMessage.style.display = 'none';
});

authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const nickname = nicknameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const passwordConfirm = passwordConfirmInput.value;
    
    errorMessage.style.display = 'none';

    // 최종 이메일 결정 로직
    let finalEmail = nickname;
    if (!nickname.includes('@')) {
        finalEmail = nickname + INTERNAL_DOMAIN;
    }

    try {
        if (isLogin) {
            // 로그인
            await signInWithEmailAndPassword(auth, finalEmail, password);
            window.location.href = 'index.html';
        } else {
            // 회원가입 유효성 검사
            if (password !== passwordConfirm) {
                throw new Error("비밀번호가 일치하지 않습니다.");
            }
            if (password.length < 6) {
                throw new Error("비밀번호는 최소 6자리 이상이어야 합니다.");
            }

            // 만약 유저가 진짜 이메일을 입력했다면 그것을 사용
            const signupEmail = email || finalEmail;

            const userCredential = await createUserWithEmailAndPassword(auth, signupEmail, password);
            
            // 프로필에 닉네임 저장
            await updateProfile(userCredential.user, {
                displayName: nickname
            });

            alert("회원가입이 완료되었습니다!");
            window.location.href = 'index.html';
        }
    } catch (error) {
        console.error(error);
        let msg = error.message;
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            msg = "닉네임 또는 비밀번호가 올바르지 않습니다.";
        } else if (error.code === 'auth/email-already-in-use') {
            msg = "이미 사용 중인 닉네임 또는 이메일입니다.";
        }
        errorMessage.textContent = msg;
        errorMessage.style.display = 'block';
    }
});

// 로그인 상태면 인덱스로 리다이렉트 (로그인/회원가입 페이지 진입 방지)
onAuthStateChanged(auth, (user) => {
    if (user && !window.location.hash.includes('logout')) {
        window.location.href = 'index.html';
    }
});
