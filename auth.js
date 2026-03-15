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
const INTERNAL_DOMAIN = "@fbwiki.com";

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
    
    // Firebase가 정상적으로 초기화되지 않았을 경우 체크
    if (!auth || typeof auth.signInWithEmailAndPassword !== 'undefined') {
        // 실제 SDK 함수가 존재하지 않으면 (dummy object 상태면) 에러 표시
        if (!auth.app) { 
            errorMessage.textContent = "Firebase 설정이 완료되지 않았습니다. firebase-config.js에 실제 API 키를 입력해 주세요.";
            errorMessage.style.display = 'block';
            return;
        }
    }

    const nickname = nicknameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const passwordConfirm = passwordConfirmInput.value;
    
    errorMessage.style.display = 'none';

    // 닉네임 유효성 검사 (회원가입 시)
    if (!isLogin && (nickname.length < 2 || nickname.length > 20)) {
        errorMessage.textContent = "닉네임은 2~20자 사이여야 합니다.";
        errorMessage.style.display = 'block';
        return;
    }

    // 최종 이메일 결정 로직 (한글 및 특수문자 대응을 위한 인코딩 지양, 대신 단순화)
    let finalEmail = nickname;
    if (!nickname.includes('@')) {
        // Firebase Auth 이메일 규칙 준수를 위해 공백 제거 및 영문/숫자 위주 추천
        // 하지만 한글 닉네임 사용을 위해 내부적으로는 ID처럼 취급
        const safeId = nickname.replace(/[^a-zA-Z0-9가-힣]/g, '');
        finalEmail = safeId + INTERNAL_DOMAIN;
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
        } else if (error.code === 'auth/invalid-email') {
            msg = "유효하지 않은 이메일 형식입니다. 닉네임에 특수문자를 제외해 주세요.";
        } else if (error.code === 'auth/operation-not-allowed') {
            msg = "Firebase Console에서 Email/Password 인증이 활성화되어 있지 않습니다.";
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
