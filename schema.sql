-- Cloudflare D1 SQL Schema for Wiki Pages
-- Run this using: npx wrangler d1 execute <DATABASE_NAME> --file=schema.sql

CREATE TABLE IF NOT EXISTS wiki_pages (
    title TEXT PRIMARY KEY,           -- 문서 제목 (Firestore의 doc ID)
    content TEXT NOT NULL,           -- 본문 내용 (Markdown)
    author TEXT,                     -- 작성자/수정자
    category TEXT,                   -- 카테고리
    species TEXT,                    -- 종족 (인포박스)
    nation TEXT,                     -- 국적 (인포박스)
    alias TEXT,                      -- 별명 (인포박스)
    birthday TEXT,                   -- 생일 (인포박스)
    image TEXT,                      -- 대표 이미지 URL
    gallery TEXT,                    -- 갤러리 이미지 URL 목록 (JSON string: ["url1", "url2"])
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP -- 수정 시간
);

-- 인덱스 추가 (카테고리별 검색이나 최신순 정렬 최적화)
CREATE INDEX IF NOT EXISTS idx_wiki_pages_updated_at ON wiki_pages(updated_at);
CREATE INDEX IF NOT EXISTS idx_wiki_pages_category ON wiki_pages(category);
