# 커뮤니티 데이터베이스 설정 가이드

## 문제 상황
댓글 기능이 작동하지 않는 경우, D1 데이터베이스에 `community_posts`와 `community_comments` 테이블이 생성되지 않았을 가능성이 높습니다.

## 해결 방법

### 방법 1: Wrangler CLI로 스키마 적용 (권장)

1. **터미널 열기**
   ```bash
   cd "c:\Users\tnara\OneDrive\바탕 화면\유수언 위키\fabulousbeasts"
   ```

2. **D1 데이터베이스에 스키마 적용**
   ```bash
   npx wrangler d1 execute fabulousbeasts --file=./schema-community.sql
   ```

3. **테이블 생성 확인**
   ```bash
   npx wrangler d1 execute fabulousbeasts --command="SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'community_%';"
   ```

### 방법 2: Cloudflare Dashboard에서 직접 실행

1. [Cloudflare Dashboard](https://dash.cloudflare.com) 접속
2. **Workers & Pages** → **D1** 메뉴로 이동
3. `fabulousbeasts` 데이터베이스 선택
4. **Console** 탭 클릭
5. `schema-community.sql` 파일의 내용을 복사해서 붙여넣기
6. **Execute** 버튼 클릭

### 방법 3: 로컬 개발 환경에서 테스트

로컬에서 테스트하려면:
```bash
npx wrangler d1 execute fabulousbeasts --local --file=./schema-community.sql
```

## 스키마 내용

### community_posts 테이블
- `id`: 게시글 고유 ID (자동 증가)
- `uid`: 작성자 Firebase UID
- `author`: 작성자 닉네임
- `title`: 게시글 제목
- `content`: 게시글 내용
- `created_at`: 작성 시간

### community_comments 테이블
- `id`: 댓글 고유 ID (자동 증가)
- `post_id`: 게시글 ID (외래키)
- `uid`: 작성자 Firebase UID
- `author`: 작성자 닉네임
- `content`: 댓글 내용
- `created_at`: 작성 시간

## 테이블 확인 방법

```bash
# 모든 테이블 목록 보기
npx wrangler d1 execute fabulousbeasts --command="SELECT name FROM sqlite_master WHERE type='table';"

# community_posts 데이터 확인
npx wrangler d1 execute fabulousbeasts --command="SELECT * FROM community_posts LIMIT 5;"

# community_comments 데이터 확인
npx wrangler d1 execute fabulousbeasts --command="SELECT * FROM community_comments LIMIT 5;"
```

## 문제 해결

### "Missing fields" 오류가 계속 발생하는 경우

1. 브라우저 개발자 도구 (F12) 열기
2. Console 탭에서 전송 데이터 확인
3. 다음 필드가 모두 포함되어 있는지 확인:
   - `post_id` (댓글인 경우)
   - `uid`
   - `author`
   - `content`

### 로그인이 되어 있는지 확인

- 상단 우측에 사용자 이름이 표시되어야 함
- 표시되지 않으면 `auth.html`에서 로그인

## 추가 명령어

```bash
# 테이블 삭제 (주의!)
npx wrangler d1 execute fabulousbeasts --command="DROP TABLE IF EXISTS community_comments;"
npx wrangler d1 execute fabulousbeasts --command="DROP TABLE IF EXISTS community_posts;"

# 데이터베이스 백업
npx wrangler d1 backup create fabulousbeasts

# 특정 게시글의 댓글 조회
npx wrangler d1 execute fabulousbeasts --command="SELECT * FROM community_comments WHERE post_id=1;"
```

## 참고사항

- API는 `CREATE TABLE IF NOT EXISTS`를 사용하므로, 이론상 자동으로 테이블이 생성되어야 합니다
- 하지만 첫 API 호출 시 타임아웃이나 권한 문제로 테이블 생성이 실패할 수 있습니다
- **수동으로 스키마를 적용하는 것을 권장**합니다
