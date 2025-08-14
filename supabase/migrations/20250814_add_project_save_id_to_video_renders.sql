-- video_renders 테이블에 project_save_id 컬럼 추가
ALTER TABLE video_renders 
ADD COLUMN IF NOT EXISTS project_save_id uuid REFERENCES project_saves(id) ON DELETE SET NULL;

-- project_save_id에 인덱스 추가 (빠른 조회를 위해)
CREATE INDEX IF NOT EXISTS idx_video_renders_project_save_id 
ON video_renders(project_save_id);

-- 코멘트 추가
COMMENT ON COLUMN video_renders.project_save_id IS '연관된 프로젝트 저장 ID (project_saves.id 참조)';