-- Fix video_generations table structure
-- This migration ensures the table has all required columns

-- First, check if the table exists
DO $$ 
BEGIN
  -- If table doesn't exist, create it
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'video_generations') THEN
    CREATE TABLE public.video_generations (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      user_id text NOT NULL DEFAULT 'anonymous',
      status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
      input_image_url text NOT NULL,
      output_video_url text,
      prompt text NOT NULL,
      selected_effects jsonb DEFAULT '[]'::jsonb,
      model_type text NOT NULL DEFAULT 'seedance' CHECK (model_type IN ('seedance', 'hailo')),
      error_message text,
      created_at timestamp with time zone DEFAULT now() NOT NULL,
      updated_at timestamp with time zone DEFAULT now() NOT NULL
    );

    -- Create indexes
    CREATE INDEX idx_video_generations_user_id ON public.video_generations(user_id);
    CREATE INDEX idx_video_generations_status ON public.video_generations(status);
    CREATE INDEX idx_video_generations_created_at ON public.video_generations(created_at DESC);

    -- Enable RLS
    ALTER TABLE public.video_generations ENABLE ROW LEVEL SECURITY;

    -- Create RLS policies
    CREATE POLICY "Users can view their own video generations" 
    ON public.video_generations FOR SELECT 
    USING (true); -- Allow all reads for MVP

    CREATE POLICY "Users can create their own video generations" 
    ON public.video_generations FOR INSERT 
    WITH CHECK (true); -- Allow all inserts for MVP

    CREATE POLICY "Users can update their own video generations" 
    ON public.video_generations FOR UPDATE 
    USING (true); -- Allow all updates for MVP
  ELSE
    -- Table exists, check and add missing columns
    
    -- Check and add input_image_url column
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'video_generations' 
                   AND column_name = 'input_image_url') THEN
      ALTER TABLE public.video_generations ADD COLUMN input_image_url text;
      
      -- If there's an image_url column, migrate data and drop it
      IF EXISTS (SELECT FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'video_generations' 
                 AND column_name = 'image_url') THEN
        UPDATE public.video_generations SET input_image_url = image_url WHERE input_image_url IS NULL;
        ALTER TABLE public.video_generations DROP COLUMN image_url;
      END IF;
      
      -- Make it NOT NULL after migration
      ALTER TABLE public.video_generations ALTER COLUMN input_image_url SET NOT NULL;
    END IF;

    -- Check and add prompt column
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'video_generations' 
                   AND column_name = 'prompt') THEN
      ALTER TABLE public.video_generations ADD COLUMN prompt text;
      
      -- If there's a combined_prompt column, migrate data
      IF EXISTS (SELECT FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'video_generations' 
                 AND column_name = 'combined_prompt') THEN
        UPDATE public.video_generations SET prompt = combined_prompt WHERE prompt IS NULL;
      END IF;
      
      -- Make it NOT NULL after migration
      ALTER TABLE public.video_generations ALTER COLUMN prompt SET NOT NULL;
    END IF;

    -- Check and add output_video_url column
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'video_generations' 
                   AND column_name = 'output_video_url') THEN
      ALTER TABLE public.video_generations ADD COLUMN output_video_url text;
      
      -- If there's a video_url column, migrate data
      IF EXISTS (SELECT FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'video_generations' 
                 AND column_name = 'video_url') THEN
        UPDATE public.video_generations SET output_video_url = video_url;
        ALTER TABLE public.video_generations DROP COLUMN video_url;
      END IF;
    END IF;

    -- Check and add other columns if missing
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'video_generations' 
                   AND column_name = 'selected_effects') THEN
      ALTER TABLE public.video_generations ADD COLUMN selected_effects jsonb DEFAULT '[]'::jsonb;
    END IF;

    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'video_generations' 
                   AND column_name = 'error_message') THEN
      ALTER TABLE public.video_generations ADD COLUMN error_message text;
    END IF;

    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'video_generations' 
                   AND column_name = 'updated_at') THEN
      ALTER TABLE public.video_generations ADD COLUMN updated_at timestamp with time zone DEFAULT now() NOT NULL;
    END IF;
  END IF;
END $$;

-- Create or replace the updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_video_generations_updated_at ON public.video_generations;
CREATE TRIGGER update_video_generations_updated_at BEFORE UPDATE ON public.video_generations 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();