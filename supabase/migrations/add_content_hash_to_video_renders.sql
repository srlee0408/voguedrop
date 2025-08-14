-- video_renders 테이블에 content_hash 컬럼 추가
ALTER TABLE video_renders 
ADD COLUMN IF NOT EXISTS content_hash text;

-- content_hash에 인덱스 추가 (빠른 조회를 위해)
CREATE INDEX IF NOT EXISTS idx_video_renders_content_hash 
ON video_renders(content_hash);

-- content_hash와 status 복합 인덱스 (자주 함께 조회되므로)
CREATE INDEX IF NOT EXISTS idx_video_renders_content_hash_status 
ON video_renders(content_hash, status);

-- 코멘트 추가
COMMENT ON COLUMN video_renders.content_hash IS '콘텐츠 해시값 (중복 렌더링 방지용)';