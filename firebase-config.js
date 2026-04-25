import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";

const firebaseConfig = {
  apiKey: "AIzaSyCCmKvWTUstJ51H1d9fKcDP0mJZmI0LgkI",
  authDomain: "fabulousbeasts.firebaseapp.com",
  projectId: "fabulousbeasts",
  storageBucket: "fabulousbeasts.appspot.com", // 수동 확인 결과 기본 버킷 주소
  messagingSenderId: "839246553606",
  appId: "1:839246553606:web:a32f2aa13293436a4ad987",
  measurementId: "G-M0V4J73C85"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);
const analytics = getAnalytics(app);

export { db, auth, storage, analytics };
