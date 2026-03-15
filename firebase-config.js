import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// TODO: Firebase Console (프로젝트 설정 > 앱 추가 > 웹)에서 받은 실제 설정값으로 교체해야 합니다.
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

let db, auth;

try {
    if (firebaseConfig.apiKey === "YOUR_API_KEY") {
        throw new Error("Firebase API Key가 설정되지 않았습니다. firebase-config.js 파일을 확인해 주세요.");
    }
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
} catch (e) {
    console.error("Firebase 초기화 실패:", e.message);
    // 더미 객체 생성 (오류 방지 및 기능 안내)
    db = {};
    auth = { 
        onAuthStateChanged: (cb) => {
            console.warn("Firebase Auth가 활성화되지 않았습니다.");
            // 초기 로딩 시 user가 없는 것으로 처리
            setTimeout(() => cb(null), 0);
        },
        currentUser: null,
        signOut: () => Promise.resolve()
    };
}

export { db, auth };
