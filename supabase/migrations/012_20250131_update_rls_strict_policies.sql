-- 엄격한 RLS 정책 설정 (Service Role 사용을 전제로 함)

-- 기존 정책 모두 삭제
DROP POLICY IF EXISTS "Users can view their own video generations" ON public.video_generations;
DROP POLICY IF EXISTS "Users can create their own video generations" ON public.video_generations;
DROP POLICY IF EXISTS "Users can update their own video generations" ON public.video_generations;
DROP POLICY IF EXISTS "Users can view own generations" ON public.video_generations;
DROP POLICY IF EXISTS "Authenticated users can create generations" ON public.video_generations;
DROP POLICY IF EXISTS "Anyone can update by job_id" ON public.video_generations;
DROP POLICY IF EXISTS "Users can delete own generations" ON public.video_generations;

-- 새로운 엄격한 RLS 정책

-- 1. SELECT: 사용자는 자신의 레코드만 조회 가능
CREATE POLICY "Users can only view own generations"
ON public.video_generations FOR SELECT
USING (auth.uid()::text = user_id);

-- 2. INSERT: 인증된 사용자만 자신의 user_id로 생성 가능
CREATE POLICY "Users can only create own generations"
ON public.video_generations FOR INSERT
WITH CHECK (auth.uid()::text = user_id);

-- 3. UPDATE: 일반 사용자는 업데이트 불가 (Service Role만 가능)
-- 정책 없음 = 일반 사용자 업데이트 차단

-- 4. DELETE: 사용자는 자신의 레코드만 삭제 가능
CREATE POLICY "Users can only delete own generations"
ON public.video_generations FOR DELETE
USING (auth.uid()::text = user_id);

-- RLS가 활성화되어 있는지 확인
ALTER TABLE public.video_generations ENABLE ROW LEVEL SECURITY;

-- 설명 추가
COMMENT ON TABLE public.video_generations IS 
'Video generation tracking. RLS enabled. Updates only via Service Role for security.';

-- video_generation_logs 테이블도 보호 (있다면)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'video_generation_logs'
  ) THEN
    -- RLS 활성화
    ALTER TABLE public.video_generation_logs ENABLE ROW LEVEL SECURITY;
    
    -- 정책: Service Role만 접근 가능 (정책 없음 = 접근 차단)
    -- 로그는 시스템 전용이므로 일반 사용자 접근 차단
  END IF;
END $$;