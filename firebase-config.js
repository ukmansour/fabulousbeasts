import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";

// 실제 Firebase 프로젝트 설정값 적용
const firebaseConfig = {
  apiKey: "AIzaSyCCmKvWTUstJ51H1d9fKcDP0mJZmI0LgkI",
  authDomain: "fabulousbeasts.firebaseapp.com",
  projectId: "fabulousbeasts",
  storageBucket: "fabulousbeasts.firebasestorage.app",
  messagingSenderId: "839246553606",
  appId: "1:839246553606:web:a32f2aa13293436a4ad987",
  measurementId: "G-M0V4J73C85"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const analytics = getAnalytics(app);

export { db, auth, analytics };
