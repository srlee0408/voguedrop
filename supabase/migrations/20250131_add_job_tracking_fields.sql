-- Add job tracking fields to video_generations table
ALTER TABLE public.video_generations 
ADD COLUMN IF NOT EXISTS job_id text UNIQUE,
ADD COLUMN IF NOT EXISTS webhook_status text CHECK (webhook_status IN ('pending', 'delivered', 'failed')),
ADD COLUMN IF NOT EXISTS webhook_delivered_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS fal_request_id text;

-- Create index for job_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_video_generations_job_id ON public.video_generations(job_id);

-- Create index for fal_request_id
CREATE INDEX IF NOT EXISTS idx_video_generations_fal_request_id ON public.video_generations(fal_request_id);

-- Add comment
COMMENT ON COLUMN public.video_generations.job_id IS 'Unique job ID for tracking async video generation';
COMMENT ON COLUMN public.video_generations.webhook_status IS 'Status of webhook delivery from fal.ai';
COMMENT ON COLUMN public.video_generations.fal_request_id IS 'Request ID returned by fal.ai for tracking';