-- Canvas AI Video Generation Tables Migration
-- Created: 2025-01-30

-- Create effect_templates table (only this table is missing)
CREATE TABLE IF NOT EXISTS public.effect_templates (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  category_id bigint NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  prompt text NOT NULL,
  preview_media_id bigint REFERENCES public.media_assets(id) ON DELETE SET NULL,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT unique_effect_template_per_category UNIQUE (name, category_id)
);

-- Create indexes for performance (IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_effect_templates_category ON public.effect_templates(category_id);
CREATE INDEX IF NOT EXISTS idx_effect_templates_active ON public.effect_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_video_generations_user_id ON public.video_generations(user_id);
CREATE INDEX IF NOT EXISTS idx_video_generations_status ON public.video_generations(status);
CREATE INDEX IF NOT EXISTS idx_video_generations_created_at ON public.video_generations(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.effect_templates ENABLE ROW LEVEL SECURITY;

-- RLS is already enabled on video_generations, skip
-- ALTER TABLE public.video_generations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for effect_templates (public read access)
CREATE POLICY "Effect templates are viewable by everyone" 
ON public.effect_templates FOR SELECT 
USING (true);

-- RLS Policies for video_generations - create only if not exists
DO $$ 
BEGIN
  -- Check and create SELECT policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'video_generations' 
    AND policyname = 'Users can view their own video generations'
  ) THEN
    CREATE POLICY "Users can view their own video generations" 
    ON public.video_generations FOR SELECT 
    USING (user_id = COALESCE(auth.uid()::text, 'anonymous'));
  END IF;

  -- Check and create INSERT policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'video_generations' 
    AND policyname = 'Users can create their own video generations'
  ) THEN
    CREATE POLICY "Users can create their own video generations" 
    ON public.video_generations FOR INSERT 
    WITH CHECK (user_id = COALESCE(auth.uid()::text, 'anonymous'));
  END IF;

  -- Check and create UPDATE policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'video_generations' 
    AND policyname = 'Users can update their own video generations'
  ) THEN
    CREATE POLICY "Users can update their own video generations" 
    ON public.video_generations FOR UPDATE 
    USING (user_id = COALESCE(auth.uid()::text, 'anonymous'));
  END IF;
END $$;

-- Add comments for documentation
COMMENT ON TABLE public.effect_templates IS 'Stores AI video effect templates with prompts for fal.ai';
COMMENT ON TABLE public.video_generations IS 'Tracks user video generation requests and results';
COMMENT ON COLUMN public.effect_templates.prompt IS 'The prompt text to be sent to fal.ai for this effect';
COMMENT ON COLUMN public.video_generations.selected_effects IS 'JSON array of effect_template IDs selected by the user';
COMMENT ON COLUMN public.video_generations.combined_prompt IS 'The final combined prompt from all selected effects';