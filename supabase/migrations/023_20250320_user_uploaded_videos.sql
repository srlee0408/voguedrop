-- Create user_uploaded_videos table
CREATE TABLE IF NOT EXISTS public.user_uploaded_videos (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    duration FLOAT,
    aspect_ratio TEXT,
    thumbnail_url TEXT,
    metadata JSONB DEFAULT '{}',
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_uploaded_videos_user_id ON public.user_uploaded_videos(user_id);
CREATE INDEX IF NOT EXISTS idx_user_uploaded_videos_uploaded_at ON public.user_uploaded_videos(uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_uploaded_videos_is_deleted ON public.user_uploaded_videos(is_deleted);

-- DISABLE RLS for MVP (security handled at API level)
-- This follows the same pattern as other tables in the project
ALTER TABLE public.user_uploaded_videos DISABLE ROW LEVEL SECURITY;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Only create trigger if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'set_updated_at' 
        AND tgrelid = 'public.user_uploaded_videos'::regclass
    ) THEN
        CREATE TRIGGER set_updated_at
            BEFORE UPDATE ON public.user_uploaded_videos
            FOR EACH ROW
            EXECUTE FUNCTION public.handle_updated_at();
    END IF;
END;
$$;

-- Grant permissions
GRANT ALL ON public.user_uploaded_videos TO authenticated;
GRANT ALL ON public.user_uploaded_videos TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.user_uploaded_videos_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.user_uploaded_videos_id_seq TO service_role;

-- Add comments for documentation
COMMENT ON TABLE public.user_uploaded_videos IS 'Stores user-uploaded video files metadata';
COMMENT ON COLUMN public.user_uploaded_videos.user_id IS 'Reference to the user who uploaded the video';
COMMENT ON COLUMN public.user_uploaded_videos.file_name IS 'Original file name of the uploaded video';
COMMENT ON COLUMN public.user_uploaded_videos.storage_path IS 'Path to the file in Supabase Storage';
COMMENT ON COLUMN public.user_uploaded_videos.file_size IS 'File size in bytes';
COMMENT ON COLUMN public.user_uploaded_videos.duration IS 'Video duration in seconds';
COMMENT ON COLUMN public.user_uploaded_videos.aspect_ratio IS 'Video aspect ratio (e.g., 16:9, 9:16, 1:1)';
COMMENT ON COLUMN public.user_uploaded_videos.thumbnail_url IS 'URL to video thumbnail if generated';
COMMENT ON COLUMN public.user_uploaded_videos.metadata IS 'Additional metadata in JSON format';
COMMENT ON COLUMN public.user_uploaded_videos.is_deleted IS 'Soft delete flag';