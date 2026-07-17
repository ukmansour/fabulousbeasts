# 댓글 기능 즉시 수정 가이드

## 🚨 지금 바로 따라하세요!

### 1단계: Cloudflare Dashboard 접속
1. https://dash.cloudflare.com 접속 및 로그인
2. 좌측 메뉴 **Workers & Pages** 클릭
3. 상단 탭 **D1** 클릭
4. **fabulousbeasts** 데이터베이스 선택

### 2단계: 테이블 생성 (Console 탭)
1. **Console** 탭 클릭
2. 아래 SQL을 **한 번에** 복사해서 붙여넣기:

```sql
-- 기존 테이블 확인
SELECT name FROM sqlite_master WHERE type='table';
```

3. **Execute** 버튼 클릭
4. 결과에 `community_posts`와 `community_comments`가 **없으면** 아래 실행:

```sql
-- 커뮤니티 게시글 테이블
CREATE TABLE IF NOT EXISTS community_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uid TEXT NOT NULL,
    author TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    image TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 커뮤니티 댓글 테이블
CREATE TABLE IF NOT EXISTS community_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    uid TEXT NOT NULL,
    author TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_community_posts_created_at ON community_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_comments_post_id ON community_comments(post_id);
```

5. **Execute** 버튼 클릭

### 3단계: 테이블 생성 확인
다시 Console에서 실행:
```sql
SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'community_%';
```

**결과:**
```
community_posts
community_comments
```
두 개가 모두 나와야 합니다!

### 4단계: 기존 테이블에 image 컬럼 추가 (선택)
테이블이 이미 있었다면:
```sql
ALTER TABLE community_posts ADD COLUMN image TEXT;
```
에러가 나도 괜찮습니다 (이미 컬럼이 있다는 의미)

---

## 🧪 테스트

### 테스트 1: 게시글 작성
1. https://fabulousbeasts.kr/community 접속
2. 로그인
3. **글쓰기** 버튼 클릭
4. 테스트 게시글 작성
5. 등록

### 테스트 2: 댓글 작성
1. 방금 작성한 게시글 클릭
2. 댓글 입력창에 "테스트" 입력
3. **댓글 등록** 버튼 클릭

**F12 (개발자 도구) → Console 탭**에서 에러 확인

---

## ❌ 여전히 안 되는 경우

### 에러 1: "Missing fields"
**원인:** 로그인이 안 되어 있거나 사용자 정보가 없음

**해결:**
1. 페이지 새로고침
2. 로그아웃 후 다시 로그인
3. 상단 우측에 "닉네임님" 표시되는지 확인

### 에러 2: "no such table: community_comments"
**원인:** D1 테이블이 생성되지 않음

**해결:**
위 2단계를 **정확히** 다시 실행

### 에러 3: "column image does not exist" (게시글 작성 시)
**원인:** image 컬럼이 없음

**해결:**
```sql
ALTER TABLE community_posts ADD COLUMN image TEXT;
```

---

## 🔍 디버깅 SQL

### 데이터 확인
```sql
-- 모든 게시글 보기
SELECT * FROM community_posts;

-- 모든 댓글 보기
SELECT * FROM community_comments;

-- 특정 게시글의 댓글 보기
SELECT * FROM community_comments WHERE post_id = 1;
```

### 테이블 구조 확인
```sql
-- community_posts 구조
PRAGMA table_info(community_posts);

-- community_comments 구조
PRAGMA table_info(community_comments);
```

### 테이블 초기화 (주의! 모든 데이터 삭제됨)
```sql
DROP TABLE IF EXISTS community_comments;
DROP TABLE IF EXISTS community_posts;

-- 그 후 위의 CREATE TABLE 다시 실행
```

---

## 💡 로컬에서 테스트하는 방법

터미널에서:
```bash
cd "c:\Users\tnara\OneDrive\바탕 화면\유수언 위키\fabulousbeasts"

# Wrangler 로그인
npx wrangler login

# 스키마 적용
npx wrangler d1 execute fabulousbeasts --remote --file=./schema-community.sql

# 테이블 확인
npx wrangler d1 execute fabulousbeasts --remote --command="SELECT name FROM sqlite_master WHERE type='table';"
```

---

## 📞 문제가 계속되면

다음 정보를 알려주세요:

1. **브라우저 콘솔 에러 메시지** (F12 → Console 탭)
2. **Network 탭에서 실패한 API 응답**
   - `/api/community/comments` 요청 클릭
   - Response 탭의 내용
3. **로그인 상태** (상단 우측 표시 확인)
4. **Cloudflare D1 Console에서 실행한 SQL 결과**

스크린샷을 찍어서 보내주시면 더 정확한 도움을 드릴 수 있습니다!
