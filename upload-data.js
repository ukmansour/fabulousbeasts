const admin = require('firebase-admin');
const serviceAccount = require('./service-account-key.json');
const { CHARACTERS, CATEGORIES, DETAIL_SECTIONS } = require('./data.js');

// Firebase Admin SDK 초기화
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function uploadData() {
    console.log('Firestore 데이터 업로드를 시작합니다...');

    // 1. Categories 업로드
    console.log('카테고리 업로드 중...');
    const categoryCollection = db.collection('categories');
    for (let i = 0; i < CATEGORIES.length; i++) {
        const categoryName = CATEGORIES[i];
        try {
            await categoryCollection.doc(categoryName.replace(/\s+/g, '-').toLowerCase()).set({ 
                name: categoryName, 
                order: i 
            });
            console.log(`- ${categoryName} 카테고리 추가됨`);
        } catch (error) {
            console.error(`${categoryName} 업로드 실패:`, error);
        }
    }

    // 2. Characters 업로드
    console.log('\n캐릭터 정보 업로드 중...');
    const characterCollection = db.collection('characters');
    for (const char of CHARACTERS) {
        try {
            await characterCollection.doc(char.id).set(char);
            console.log(`- ${char.name} (${char.id}) 캐릭터 추가됨`);
        } catch (error) {
            console.error(`${char.name} 업로드 실패:`, error);
        }
    }

    console.log('\n✅ 모든 데이터 업로드가 완료되었습니다.');
    process.exit(0);
}

uploadData().catch(error => {
    console.error('데이터 업로드 중 심각한 오류 발생:', error);
    process.exit(1);
});
