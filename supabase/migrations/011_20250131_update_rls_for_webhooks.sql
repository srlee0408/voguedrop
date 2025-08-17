-- RLS 정책 업데이트: webhook이 video_generations 테이블을 업데이트할 수 있도록 허용

-- 기존 정책 삭제 (있다면)
DROP POLICY IF EXISTS "Users can view their own video generations" ON public.video_generations;
DROP POLICY IF EXISTS "Users can create their own video generations" ON public.video_generations;
DROP POLICY IF EXISTS "Users can update their own video generations" ON public.video_generations;

-- 새로운 RLS 정책 생성

-- 1. 사용자는 자신의 비디오 생성 기록을 볼 수 있음
CREATE POLICY "Users can view own generations"
ON public.video_generations FOR SELECT
USING (
  auth.uid()::text = user_id OR
  user_id = 'anonymous'
);

-- 2. 인증된 사용자는 비디오 생성을 만들 수 있음
CREATE POLICY "Authenticated users can create generations"
ON public.video_generations FOR INSERT
WITH CHECK (
  auth.uid()::text = user_id OR
  user_id = 'anonymous'
);

-- 3. 모든 사용자가 job_id로 업데이트 가능 (webhook 지원)
-- job_id가 있는 레코드는 webhook에서 업데이트 가능
CREATE POLICY "Anyone can update by job_id"
ON public.video_generations FOR UPDATE
USING (job_id IS NOT NULL)
WITH CHECK (job_id IS NOT NULL);

-- 4. 사용자는 자신의 레코드를 삭제할 수 있음
CREATE POLICY "Users can delete own generations"
ON public.video_generations FOR DELETE
USING (
  auth.uid()::text = user_id
);