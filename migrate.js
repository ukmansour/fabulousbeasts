/**
 * Migration Script: Firestore to Cloudflare D1
 * 이 스크립트는 Firestore의 데이터를 읽어서 D1에 삽입할 수 있는 SQL 문으로 변환합니다.
 */

// 주의: 이 코드는 로컬 Node.js 환경에서 실행해야 합니다.
// 필요한 패키지: npm install firebase-admin

const admin = require('firebase-admin');
const fs = require('fs');

// Firebase 서비스 계정 키 파일 경로 (Firestore 설정에서 생성 가능)
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function migrate() {
  const snapshot = await db.collection('characters').get();
  let sql = '-- Firestore Migration Data\n';

  snapshot.forEach(doc => {
    const data = doc.data();
    const title = doc.id;
    const content = (data.details || '').replace(/'/g, "''"); // SQL escape
    const author = (data.updatedBy || 'Anonymous').replace(/'/g, "''");
    const category = (data.category || 'General').replace(/'/g, "''");
    const species = (data.species || '').replace(/'/g, "''");
    const nation = (data.nation || '').replace(/'/g, "''");
    const alias = (data.alias || '').replace(/'/g, "''");
    const birthday = (data.birthday || '').replace(/'/g, "''");
    const image = (data.image || '').replace(/'/g, "''");
    const gallery = JSON.stringify(data.gallery || []);

    sql += `INSERT INTO wiki_pages (title, content, author, category, species, nation, alias, birthday, image, gallery) \n`;
    sql += `VALUES ('${title}', '${content}', '${author}', '${category}', '${species}', '${nation}', '${alias}', '${birthday}', '${image}', '${gallery}') \n`;
    sql += `ON CONFLICT(title) DO UPDATE SET content=excluded.content, author=excluded.author;\n\n`;
  });

  fs.writeFileSync('migration_data.sql', sql);
  console.log('Migration SQL generated: migration_data.sql');
  console.log('Run this to migrate: npx wrangler d1 execute <DB_NAME> --file=migration_data.sql');
}

migrate().catch(console.error);
