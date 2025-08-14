-- video_renders 테이블 생성
CREATE TABLE IF NOT EXISTS video_renders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_name text NOT NULL,
  render_id text NOT NULL UNIQUE,
  status text DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  aspect_ratio text CHECK (aspect_ratio IN ('9:16', '1:1', '16:9')),
  duration_frames integer,
  output_url text,
  thumbnail_url text,
  video_clips jsonb, -- 렌더링에 사용된 클립 정보 저장
  text_clips jsonb,  -- 텍스트 효과 정보 저장
  sound_clips jsonb, -- 사운드 정보 저장
  created_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_video_renders_user_id ON video_renders(user_id);
CREATE INDEX IF NOT EXISTS idx_video_renders_render_id ON video_renders(render_id);
CREATE INDEX IF NOT EXISTS idx_video_renders_status ON video_renders(status);
CREATE INDEX IF NOT EXISTS idx_video_renders_created_at ON video_renders(created_at DESC);

-- RLS (Row Level Security) 정책
ALTER TABLE video_renders ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 렌더링만 볼 수 있음
CREATE POLICY "Users can view own renders" ON video_renders
  FOR SELECT USING (auth.uid() = user_id);

-- 사용자는 자신의 렌더링만 생성할 수 있음
CREATE POLICY "Users can create own renders" ON video_renders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 사용자는 자신의 렌더링만 업데이트할 수 있음
CREATE POLICY "Users can update own renders" ON video_renders
  FOR UPDATE USING (auth.uid() = user_id);

-- 사용자는 자신의 렌더링만 삭제할 수 있음
CREATE POLICY "Users can delete own renders" ON video_renders
  FOR DELETE USING (auth.uid() = user_id);

-- 코멘트 추가
COMMENT ON TABLE video_renders IS '비디오 렌더링 작업 기록';
COMMENT ON COLUMN video_renders.user_id IS '렌더링을 요청한 사용자 ID';
COMMENT ON COLUMN video_renders.project_name IS '프로젝트 이름 (사용자가 지정)';
COMMENT ON COLUMN video_renders.render_id IS 'Remotion Lambda 렌더링 ID';
COMMENT ON COLUMN video_renders.status IS '렌더링 상태: processing, completed, failed';
COMMENT ON COLUMN video_renders.aspect_ratio IS '비디오 화면 비율';
COMMENT ON COLUMN video_renders.duration_frames IS '총 프레임 수';
COMMENT ON COLUMN video_renders.output_url IS '완성된 MP4 파일 S3 URL';
COMMENT ON COLUMN video_renders.thumbnail_url IS '썸네일 이미지 URL';
COMMENT ON COLUMN video_renders.video_clips IS '사용된 비디오 클립 정보 (JSON)';
COMMENT ON COLUMN video_renders.text_clips IS '사용된 텍스트 효과 정보 (JSON)';
COMMENT ON COLUMN video_renders.sound_clips IS '사용된 사운드 정보 (JSON)';