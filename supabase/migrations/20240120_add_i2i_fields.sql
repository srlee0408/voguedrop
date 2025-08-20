-- Add I2I mode support to image_brush_history table
-- This migration adds fields for storing reference images and style strength used in I2I mode
-- Note: RLS is disabled - security is handled through Next.js API Routes

-- Check if columns need to be renamed (only if they exist with old names)
DO $$
BEGIN
  -- Check and rename original_image to original_image_url if needed
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'image_brush_history' 
             AND column_name = 'original_image'
             AND table_schema = 'public') 
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'image_brush_history' 
                      AND column_name = 'original_image_url'
                      AND table_schema = 'public') THEN
    ALTER TABLE public.image_brush_history 
    RENAME COLUMN original_image TO original_image_url;
  END IF;
  
  -- Check and rename mask_image to mask_image_url if needed
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'image_brush_history' 
             AND column_name = 'mask_image'
             AND table_schema = 'public') 
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'image_brush_history' 
                      AND column_name = 'mask_image_url'
                      AND table_schema = 'public') THEN
    ALTER TABLE public.image_brush_history 
    RENAME COLUMN mask_image TO mask_image_url;
  END IF;
END $$;

-- Add reference_image_url column for I2I mode (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'image_brush_history' 
                 AND column_name = 'reference_image_url'
                 AND table_schema = 'public') THEN
    ALTER TABLE public.image_brush_history
    ADD COLUMN reference_image_url TEXT;
  END IF;
END $$;

-- Add style_strength column for I2I mode (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'image_brush_history' 
                 AND column_name = 'style_strength'
                 AND table_schema = 'public') THEN
    ALTER TABLE public.image_brush_history
    ADD COLUMN style_strength DECIMAL(3,2) DEFAULT 1.0 
    CHECK (style_strength >= 0.5 AND style_strength <= 1.5);
  END IF;
END $$;

-- Ensure columns are TEXT type for storing URLs
ALTER TABLE public.image_brush_history
ALTER COLUMN original_image_url TYPE TEXT,
ALTER COLUMN mask_image_url TYPE TEXT;

-- Add index for I2I mode queries
CREATE INDEX IF NOT EXISTS idx_image_brush_history_mode_i2i 
ON public.image_brush_history(mode) 
WHERE mode = 'i2i';

-- Add index for reference image lookups
CREATE INDEX IF NOT EXISTS idx_image_brush_history_reference_image 
ON public.image_brush_history(reference_image_url) 
WHERE reference_image_url IS NOT NULL;

-- Update column comments
COMMENT ON COLUMN public.image_brush_history.reference_image_url 
IS 'URL of the reference image used in I2I mode (stored in Supabase Storage)';

COMMENT ON COLUMN public.image_brush_history.style_strength 
IS 'Style strength applied in I2I mode (0.5 = weak, 1.0 = normal, 1.5 = strong)';

COMMENT ON COLUMN public.image_brush_history.original_image_url 
IS 'URL of the original image (stored in Supabase Storage)';

COMMENT ON COLUMN public.image_brush_history.mask_image_url 
IS 'URL of the mask image (stored in Supabase Storage)';

-- Note: Validation is handled in Next.js API Routes instead of database triggers
-- This follows the project pattern of using server-side API validation
-- RLS is disabled and all access control is managed through API Routes

-- Create a view for easier querying of I2I mode history (optional)
-- This view can be useful for analytics and debugging
CREATE OR REPLACE VIEW public.image_brush_i2i_history AS
SELECT 
  id,
  user_id,
  original_image_url,
  mask_image_url,
  reference_image_url,
  prompt,
  result_url,
  style_strength,
  processing_time,
  metadata,
  created_at,
  updated_at
FROM public.image_brush_history
WHERE mode = 'i2i'
ORDER BY created_at DESC;

COMMENT ON VIEW public.image_brush_i2i_history IS 'View of I2I mode image brush history entries - Access through API Routes only';

-- Security Note:
-- RLS is intentionally DISABLED on these tables
-- All access control is managed through Next.js API Routes using Service Role Key
-- Direct client access is not allowed for security reasons