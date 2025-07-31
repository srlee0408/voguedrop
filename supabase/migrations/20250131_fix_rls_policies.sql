-- Fix RLS policies for MVP to allow anonymous access
-- This migration updates existing restrictive policies

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own video generations" ON public.video_generations;
DROP POLICY IF EXISTS "Users can create their own video generations" ON public.video_generations;
DROP POLICY IF EXISTS "Users can update their own video generations" ON public.video_generations;

-- Create new permissive policies for MVP
CREATE POLICY "Allow all video generation reads" 
ON public.video_generations FOR SELECT 
USING (true);

CREATE POLICY "Allow all video generation inserts" 
ON public.video_generations FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow all video generation updates" 
ON public.video_generations FOR UPDATE 
USING (true);

-- Also ensure RLS is enabled (it should already be)
ALTER TABLE public.video_generations ENABLE ROW LEVEL SECURITY;

-- Add comment explaining MVP approach
COMMENT ON POLICY "Allow all video generation reads" ON public.video_generations IS 'MVP: Allow all reads without authentication';
COMMENT ON POLICY "Allow all video generation inserts" ON public.video_generations IS 'MVP: Allow all inserts without authentication';
COMMENT ON POLICY "Allow all video generation updates" ON public.video_generations IS 'MVP: Allow all updates without authentication';