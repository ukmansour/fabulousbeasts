-- Cloudflare D1 SQL Schema for Wiki Pages
-- Run this using: npx wrangler d1 execute <DATABASE_NAME> --file=schema.sql

CREATE TABLE IF NOT EXISTS wiki_pages (
    title TEXT PRIMARY KEY,           -- 문서 제목 (Firestore의 doc ID)
    name TEXT,                       -- 표시 이름 (인포박스 상단)
    content TEXT NOT NULL,           -- 본문 내용 (Markdown)
    author TEXT,                     -- 작성자/수정자
    category TEXT,                   -- 카테고리
    species TEXT,                    -- 종족 (인포박스)
    nation TEXT,                     -- 국적 (인포박스)
    alias TEXT,                      -- 별명 (인포박스)
    birthday TEXT,                   -- 생일 (인포박스)
    image TEXT,                      -- 대표 이미지 URL
    gallery TEXT,                    -- 갤러리 이미지 URL 목록 (JSON string: ["url1", "url2"])
    custom_info TEXT,                -- 커스텀 정보 목록 (JSON string: [{"key": "무기", "value": "검"}])
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP -- 수정 시간
);

-- 인덱스 추가 (카테고리별 검색이나 최신순 정렬 최적화)
CREATE INDEX IF NOT EXISTS idx_wiki_pages_updated_at ON wiki_pages(updated_at);
CREATE INDEX IF NOT EXISTS idx_wiki_pages_category ON wiki_pages(category);

-- 사용자 권한 테이블
CREATE TABLE IF NOT EXISTS users (
    uid TEXT PRIMARY KEY,
    role TEXT DEFAULT 'member',
    name TEXT,
    nickname TEXT, -- 하위 호환성 유지
    email TEXT,
    is_banned INTEGER DEFAULT 0, -- 0: false, 1: true
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 수정 이력(History) 테이블
CREATE TABLE IF NOT EXISTS wiki_revisions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT,
    author TEXT,
    edited_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
-- 사이트 설정 (공지사항, 소식 등)
CREATE TABLE IF NOT EXISTS site_settings (
    key TEXT PRIMARY KEY,
    value TEXT
);

-- 기본값 삽입 (중복 방지)
INSERT OR IGNORE INTO site_settings (key, value) VALUES ('notice', '- 유수언 위키 리뉴얼 오픈!\n- 2026.04.30 베타 버전 출시');
INSERT OR IGNORE INTO site_settings (key, value) VALUES ('news', '- 신규 캐릭터 추가 준비 중\n- 시스템 최적화 완료');
