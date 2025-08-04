-- Add favorite functionality to video_generations table
-- Created: 2025-02-04

-- Add is_favorite column to video_generations table
ALTER TABLE public.video_generations 
ADD COLUMN IF NOT EXISTS is_favorite boolean DEFAULT false;

-- Create index for faster queries on favorite videos
CREATE INDEX IF NOT EXISTS idx_video_generations_is_favorite 
ON public.video_generations(is_favorite) 
WHERE is_favorite = true;

-- Create composite index for user's favorite videos
CREATE INDEX IF NOT EXISTS idx_video_generations_user_favorite 
ON public.video_generations(user_id, is_favorite, created_at DESC) 
WHERE is_favorite = true;

-- Add comment for documentation
COMMENT ON COLUMN public.video_generations.is_favorite IS 'Whether the user has marked this video as a favorite';