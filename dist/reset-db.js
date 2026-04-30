import { db, auth } from './firebase-config.js';
import { CHARACTERS } from './data.js';
import { doc, setDoc, deleteDoc, getDocs, collection, writeBatch } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export async function resetDatabase() {
    if (!confirm("정말로 모든 캐릭터 데이터를 초기화하고 다시 추가하시겠습니까? 기존의 모든 상세 정보가 삭제됩니다.")) return;
    
    const user = auth.currentUser;
    if (!user) {
        alert("로그인이 필요합니다.");
        return;
    }

    try {
        console.log("Starting database reset...");
        const batch = writeBatch(db);
        
        // 1. 기존 데이터 가져오기 (전체 삭제를 위해)
        const snap = await getDocs(collection(db, "characters"));
        snap.forEach((d) => {
            batch.delete(d.ref);
        });
        
        // 2. 새로운 기본 데이터 추가
        CHARACTERS.forEach((char) => {
            const docRef = doc(db, "characters", char.id);
            const newData = {
                id: char.id,
                name: char.name,
                category: char.category,
                title: "내용이 비어있습니다.",
                details: "내용이 비어있습니다.",
                updatedAt: new Date().toISOString(),
                updatedBy: user.displayName || user.email
            };
            batch.set(docRef, newData);
        });
        
        await batch.commit();
        alert("성공적으로 초기화되었습니다!");
        location.reload();
    } catch (e) {
        console.error("Reset failed:", e);
        alert("초기화 실패: " + e.message);
    }
}

// 개발자 도구에서 접근 가능하도록 등록
window.resetDatabase = resetDatabase;
