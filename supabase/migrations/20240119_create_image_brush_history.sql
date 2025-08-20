-- Create image_brush_history table for tracking AI image editing history
-- Note: RLS is DISABLED - Access is controlled through Next.js API Routes only
CREATE TABLE IF NOT EXISTS public.image_brush_history (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  original_image TEXT, -- Reference to original image (first 100 chars of base64)
  mask_image TEXT, -- Reference to mask image (first 100 chars of base64)
  prompt TEXT NOT NULL, -- User prompt for generation
  result_url TEXT NOT NULL, -- URL of the generated image in Supabase Storage
  mode TEXT CHECK (mode IN ('flux', 'i2i')) DEFAULT 'flux', -- Processing mode
  processing_time INTEGER, -- Processing time in milliseconds
  metadata JSONB DEFAULT '{}', -- Additional metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_image_brush_history_user_id ON public.image_brush_history(user_id);
CREATE INDEX idx_image_brush_history_created_at ON public.image_brush_history(created_at DESC);

-- IMPORTANT: RLS is intentionally DISABLED
-- This table should only be accessed through server-side API routes using Service Role Key
-- Direct client access is not allowed for security reasons
ALTER TABLE public.image_brush_history DISABLE ROW LEVEL SECURITY;

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_image_brush_history_updated_at
  BEFORE UPDATE ON public.image_brush_history
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment to table
COMMENT ON TABLE public.image_brush_history IS 'Stores history of AI image brush (inpainting) operations';
COMMENT ON COLUMN public.image_brush_history.original_image IS 'Reference to original image (truncated base64 for logging)';
COMMENT ON COLUMN public.image_brush_history.mask_image IS 'Reference to mask image (truncated base64 for logging)';
COMMENT ON COLUMN public.image_brush_history.prompt IS 'User prompt used for AI generation';
COMMENT ON COLUMN public.image_brush_history.result_url IS 'Public URL of the generated image';
COMMENT ON COLUMN public.image_brush_history.mode IS 'Processing mode: flux (FLUX Fill) or i2i (Image to Image)';
COMMENT ON COLUMN public.image_brush_history.processing_time IS 'Time taken to process in milliseconds';