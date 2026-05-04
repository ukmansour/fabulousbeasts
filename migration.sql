-- SQLite D1 Migration Script
-- 이미 존재하는 users 테이블에 누락된 컬럼(name, is_banned)을 추가합니다.

-- name 컬럼 추가 (실패해도 무시할 수 있도록 에러 처리가 필요하지만 D1에서는 한 줄씩 실행됨)
ALTER TABLE users ADD COLUMN name TEXT;

-- is_banned 컬럼 추가
ALTER TABLE users ADD COLUMN is_banned INTEGER DEFAULT 0;
