-- project_saves 테이블 생성
CREATE TABLE IF NOT EXISTS project_saves (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_name text NOT NULL,
  latest_render_id text,
  content_snapshot jsonb NOT NULL,
  content_hash text NOT NULL,
  version integer DEFAULT 1 NOT NULL,
  is_latest boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_project_saves_user_id ON project_saves(user_id);
CREATE INDEX IF NOT EXISTS idx_project_saves_project_name ON project_saves(project_name);
CREATE INDEX IF NOT EXISTS idx_project_saves_is_latest ON project_saves(is_latest);
CREATE INDEX IF NOT EXISTS idx_project_saves_content_hash ON project_saves(content_hash);
CREATE INDEX IF NOT EXISTS idx_project_saves_user_project_latest ON project_saves(user_id, project_name, is_latest);

-- RLS (Row Level Security) 정책 - MVP이므로 일단 비활성화
ALTER TABLE project_saves DISABLE ROW LEVEL SECURITY;

-- 향후 RLS 활성화 시 사용할 정책들 (주석 처리)
-- ALTER TABLE project_saves ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 프로젝트만 볼 수 있음
-- CREATE POLICY "Users can view own project saves" ON project_saves
--   FOR SELECT USING (auth.uid() = user_id);

-- 사용자는 자신의 프로젝트만 생성할 수 있음
-- CREATE POLICY "Users can create own project saves" ON project_saves
--   FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 사용자는 자신의 프로젝트만 업데이트할 수 있음
-- CREATE POLICY "Users can update own project saves" ON project_saves
--   FOR UPDATE USING (auth.uid() = user_id);

-- 사용자는 자신의 프로젝트만 삭제할 수 있음
-- CREATE POLICY "Users can delete own project saves" ON project_saves
--   FOR DELETE USING (auth.uid() = user_id);

-- 코멘트 추가
COMMENT ON TABLE project_saves IS '비디오 프로젝트 저장 기록';
COMMENT ON COLUMN project_saves.user_id IS '프로젝트를 저장한 사용자 ID';
COMMENT ON COLUMN project_saves.project_name IS '프로젝트 이름 (사용자가 지정)';
COMMENT ON COLUMN project_saves.latest_render_id IS '최신 렌더링 ID (video_renders.render_id 참조)';
COMMENT ON COLUMN project_saves.content_snapshot IS '프로젝트 컨텐츠 스냅샷 (클립, 설정 등 JSON)';
COMMENT ON COLUMN project_saves.content_hash IS '컨텐츠 해시 (변경사항 감지용)';
COMMENT ON COLUMN project_saves.version IS '프로젝트 버전 번호';
COMMENT ON COLUMN project_saves.is_latest IS '최신 버전 여부';
COMMENT ON COLUMN project_saves.created_at IS '생성 시간';
COMMENT ON COLUMN project_saves.updated_at IS '업데이트 시간';

-- updated_at 자동 업데이트 트리거 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- updated_at 트리거 생성
CREATE TRIGGER update_project_saves_updated_at BEFORE UPDATE
    ON project_saves FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();