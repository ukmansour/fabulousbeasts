import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";

const firebaseConfig = {
  apiKey: "AIzaSyCCmKvWTUstJ51H1d9fKcDP0mJZmI0LgkI",
  authDomain: "fabulousbeasts.firebaseapp.com",
  projectId: "fabulousbeasts",
  storageBucket: "fabulousbeasts.firebasestorage.app", // 원래 주소로 복구
  messagingSenderId: "839246553606",
  appId: "1:839246553606:web:a32f2aa13293436a4ad987",
  measurementId: "G-M0V4J73C85"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);
const analytics = getAnalytics(app);

// ─── Firestore 읽기 추적 및 최적화 도구 ────────────────────────
const DB_TRACKER = {
    readCount: 0,
    isTestMode: true, // 테스트 모드: true일 경우 콘솔에 호출 정보 상세 기록
    log(type, path, count = 1) {
        this.readCount += count;
        if (this.isTestMode) {
            console.log(`%c[DB READ] ${type} | 누적: ${this.readCount} | 경로: ${path}`, "color: #ff9800; font-weight: bold;");
        }
        if (this.readCount > 1000) {
            console.warn("⚠️ 단일 세션에서 읽기 호출이 1000건을 초과했습니다. 무한 루프를 점검하세요!");
        }
    }
};

// 안전한 데이터 호출 래퍼 (기존 라이브러리 함수와 이름을 구분)
import { 
    getDoc as firestoreGetDoc, 
    getDocs as firestoreGetDocs,
    limit as firestoreLimit,
    query as firestoreQuery
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

async function getDocSafe(docRef) {
    DB_TRACKER.log("getDoc", docRef.path);
    return await firestoreGetDoc(docRef);
}

async function getDocsSafe(queryOrColl, limitCount = 10) {
    let finalQuery = queryOrColl;
    // limit이 없는 경우 자동으로 10개 제한 추가
    if (limitCount > 0) {
        finalQuery = firestoreQuery(queryOrColl, firestoreLimit(limitCount));
    }
    DB_TRACKER.log("getDocs", queryOrColl.path || "Query", limitCount);
    return await firestoreGetDocs(finalQuery);
}

export { db, auth, storage, analytics, getDocSafe, getDocsSafe, DB_TRACKER };
