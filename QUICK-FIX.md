# 댓글 기능 빠른 수정 가이드

## 🚨 즉시 해결 방법 (Cloudflare Dashboard 사용)

### 1단계: Cloudflare Dashboard 접속

1. https://dash.cloudflare.com 접속 후 로그인
2. 좌측 메뉴에서 **Workers & Pages** 클릭
3. 상단 탭에서 **D1** 클릭
4. `fabulousbeasts` 데이터베이스 선택

### 2단계: 스키마 실행

1. **Console** 탭 클릭
2. 아래 SQL을 복사해서 붙여넣기:

```sql
-- 커뮤니티 게시글 테이블 (이미지 지원 포함)
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
CREATE INDEX IF NOT EXISTS idx_community_comments_created_at ON community_comments(created_at);
```

3. **Execute** 버튼 클릭

### 2-1단계: 기존 테이블이 있다면 image 컬럼 추가

기존 테이블에 이미지 컬럼이 없다면 추가:

```sql
-- 기존 community_posts 테이블에 image 컬럼 추가
ALTER TABLE community_posts ADD COLUMN image TEXT;
```

**참고**: 테이블이 이미 image 컬럼을 가지고 있으면 에러가 발생하는데, 무시해도 됩니다.

### 3단계: 확인

Console에서 다음 SQL 실행:
```sql
SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'community_%';
```

`community_posts`와 `community_comments`가 표시되면 성공!

---

## 💡 로컬에서 해결하는 방법

### 방법 1: Wrangler 로그인 후 실행

```bash
# Cloudflare 로그인
npx wrangler login

# 스키마 적용
npx wrangler d1 execute fabulousbeasts --file=./schema-community.sql --remote

# 확인
npx wrangler d1 execute fabulousbeasts --remote --command="SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'community_%';"
```

### 방법 2: API Token 사용

1. https://dash.cloudflare.com/profile/api-tokens 접속
2. **Create Token** 클릭
3. **Edit Cloudflare Workers** 템플릿 선택
4. Token 생성 후 복사

PowerShell에서:
```powershell
$env:CLOUDFLARE_API_TOKEN="your-token-here"
npx wrangler d1 execute fabulousbeasts --file=./schema-community.sql --remote
```

---

## ✅ 테스트 방법

1. 사이트 방문: https://fabulousbeasts.kr/community
2. 로그인 (상단 우측 "로그인" 버튼)
3. **글쓰기** 버튼 클릭
4. 테스트 게시글 작성
5. **이미지 첨부** 버튼으로 사진 선택 (선택사항, 5MB 이하)
6. 게시글 등록
7. 게시글 클릭 후 댓글 작성 시도

브라우저 개발자 도구 (F12) → Console 탭에서 에러 확인

### 이미지 업로드 기능
- 지원 형식: JPG, PNG, GIF, WEBP 등 모든 이미지 형식
- 최대 크기: 5MB
- 저장 위치: Cloudflare R2 (community 폴더)
- 게시글 목록에서 이미지가 있는 글은 📷 아이콘 표시
- 상세보기에서 이미지 클릭 시 원본 크기로 새 탭에서 열림

---

## 🔍 문제가 계속되는 경우

### 1. 브라우저 콘솔에서 전송 데이터 확인

댓글 작성 시 콘솔에 출력되는 "댓글 전송 데이터:" 로그 확인:
```json
{
  "post_id": 1,
  "uid": "abc123...",
  "author": "닉네임",
  "content": "댓글 내용"
}
```

모든 필드가 있는지 확인!

### 2. 로그인 상태 확인

- 상단 우측에 "닉네임님" 표시되어야 함
- 표시 안 되면 → https://fabulousbeasts.kr/auth.html 에서 로그인

### 3. API 응답 확인

개발자 도구 → Network 탭:
- `/api/community/comments` 요청 찾기
- Response 탭에서 에러 메시지 확인
- `"error": "Missing fields"` → 로그인 재시도
- `"error": "no such table"` → 스키마 재적용 필요

---

## 📞 추가 도움

문제가 계속되면 다음 정보와 함께 알려주세요:

1. 브라우저 콘솔의 에러 메시지
2. Network 탭의 API 응답
3. "댓글 전송 데이터:" 로그 내용
