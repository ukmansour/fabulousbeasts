-- ===================================
-- 커뮤니티 테이블 업데이트 (avatar, updated_at 추가)
-- ===================================

-- community_posts 테이블에 컬럼 추가
ALTER TABLE community_posts ADD COLUMN avatar TEXT;
ALTER TABLE community_posts ADD COLUMN updated_at DATETIME;
ALTER TABLE community_posts ADD COLUMN videos TEXT;

-- 인덱스 확인
CREATE INDEX IF NOT EXISTS idx_community_posts_created_at ON community_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_comments_post_id ON community_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_community_comments_created_at ON community_comments(created_at);
