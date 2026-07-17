-- =====================================
-- 커뮤니티 데이터베이스 테스트 및 생성
-- =====================================
-- Cloudflare D1 Console에 붙여넣기

-- 1. 기존 테이블 확인
SELECT '=== 현재 테이블 목록 ===' AS step;
SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'community_%';

-- 2. 커뮤니티 테이블 생성
SELECT '=== 테이블 생성 중 ===' AS step;

CREATE TABLE IF NOT EXISTS community_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uid TEXT NOT NULL,
    author TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    image TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS community_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    uid TEXT NOT NULL,
    author TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. 인덱스 생성
SELECT '=== 인덱스 생성 중 ===' AS step;

CREATE INDEX IF NOT EXISTS idx_community_posts_created_at ON community_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_comments_post_id ON community_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_community_comments_created_at ON community_comments(created_at);

-- 4. 테이블 구조 확인
SELECT '=== community_posts 구조 ===' AS step;
PRAGMA table_info(community_posts);

SELECT '=== community_comments 구조 ===' AS step;
PRAGMA table_info(community_comments);

-- 5. 데이터 확인
SELECT '=== 게시글 데이터 ===' AS step;
SELECT COUNT(*) as total_posts FROM community_posts;

SELECT '=== 댓글 데이터 ===' AS step;
SELECT COUNT(*) as total_comments FROM community_comments;

-- 완료
SELECT '=== ✅ 완료! ===' AS step;
