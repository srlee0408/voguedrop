-- Temporarily disable RLS for MVP
-- This allows all operations without authentication checks

-- Disable RLS on video_generations table
ALTER TABLE public.video_generations DISABLE ROW LEVEL SECURITY;

-- Add comment explaining this is temporary for MVP
COMMENT ON TABLE public.video_generations IS 'Video generation tracking table. RLS disabled for MVP phase.';

-- Note: Re-enable RLS after implementing proper authentication
-- ALTER TABLE public.video_generations ENABLE ROW LEVEL SECURITY;