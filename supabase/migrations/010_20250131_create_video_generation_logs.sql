-- Create video_generation_logs table for tracking generation process
CREATE TABLE IF NOT EXISTS public.video_generation_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  job_id text NOT NULL,
  level text NOT NULL CHECK (level IN ('info', 'warning', 'error')),
  message text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  timestamp timestamp with time zone DEFAULT now() NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create indexes for efficient querying
CREATE INDEX idx_video_generation_logs_job_id ON public.video_generation_logs(job_id);
CREATE INDEX idx_video_generation_logs_timestamp ON public.video_generation_logs(timestamp DESC);
CREATE INDEX idx_video_generation_logs_level ON public.video_generation_logs(level);

-- Add comment
COMMENT ON TABLE public.video_generation_logs IS 'Logs for video generation process tracking';

-- Disable RLS for MVP (enable later with proper policies)
ALTER TABLE public.video_generation_logs DISABLE ROW LEVEL SECURITY;
EOF < /dev/null