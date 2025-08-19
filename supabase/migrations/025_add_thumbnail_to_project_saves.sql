-- Add thumbnail_url column to project_saves table
-- 프로젝트의 대표 썸네일 이미지 URL을 저장하기 위한 컬럼 추가

ALTER TABLE project_saves 
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- 컬럼에 대한 설명 추가
COMMENT ON COLUMN project_saves.thumbnail_url IS 'Thumbnail URL for the project (typically from the first video clip)';

-- 인덱스 추가 (썸네일이 있는 프로젝트를 빠르게 조회하기 위함)
CREATE INDEX IF NOT EXISTS idx_project_saves_thumbnail 
ON project_saves(thumbnail_url) 
WHERE thumbnail_url IS NOT NULL;