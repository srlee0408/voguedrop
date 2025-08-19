-- Create user_uploaded_music table for storing user-uploaded music files
CREATE TABLE IF NOT EXISTS public.user_uploaded_music (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    duration FLOAT,
    metadata JSONB DEFAULT '{}',
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_user_uploaded_music_user_id ON public.user_uploaded_music(user_id);
CREATE INDEX idx_user_uploaded_music_uploaded_at ON public.user_uploaded_music(uploaded_at DESC);
CREATE INDEX idx_user_uploaded_music_is_deleted ON public.user_uploaded_music(is_deleted);
CREATE INDEX idx_user_uploaded_music_genre ON public.user_uploaded_music(genre);

-- DISABLE RLS for MVP (security handled at API level)
ALTER TABLE public.user_uploaded_music DISABLE ROW LEVEL SECURITY;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_music_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_music_updated_at
    BEFORE UPDATE ON public.user_uploaded_music
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_music_updated_at();

-- Grant permissions
GRANT ALL ON public.user_uploaded_music TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.user_uploaded_music_id_seq TO authenticated;

-- Add comment for documentation
COMMENT ON TABLE public.user_uploaded_music IS 'Stores metadata for user-uploaded music files in Storage';
COMMENT ON COLUMN public.user_uploaded_music.storage_path IS 'Path in user-upload bucket: music/{user_id}/{timestamp}_{filename}';
COMMENT ON COLUMN public.user_uploaded_music.bpm IS 'Beats per minute for tempo matching';
COMMENT ON COLUMN public.user_uploaded_music.metadata IS 'Additional metadata: mime_type, original_name, bitrate, sample_rate, etc';