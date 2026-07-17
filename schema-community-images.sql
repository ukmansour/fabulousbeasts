-- ===================================
-- 커뮤니티 게시글 이미지 지원 추가
-- ===================================

-- 기존 테이블에 image 컬럼 추가 (이미 있으면 에러 무시)
ALTER TABLE community_posts ADD COLUMN image TEXT;

-- 또는 테이블이 없다면 새로 생성
CREATE TABLE IF NOT EXISTS community_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uid TEXT NOT NULL,
    author TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    image TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
