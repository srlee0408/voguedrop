-- Update image_brush_history table to store URLs instead of base64 references
-- This migration adds new columns for storing image URLs and migrates existing data

-- Add new URL columns
ALTER TABLE public.image_brush_history 
ADD COLUMN IF NOT EXISTS original_image_url TEXT,
ADD COLUMN IF NOT EXISTS mask_image_url TEXT;

-- Update column comments
COMMENT ON COLUMN public.image_brush_history.original_image_url IS 'Public URL of the original image stored in Supabase Storage';
COMMENT ON COLUMN public.image_brush_history.mask_image_url IS 'Public URL of the mask image stored in Supabase Storage';

-- Keep old columns for backward compatibility but mark as deprecated
COMMENT ON COLUMN public.image_brush_history.original_image IS 'DEPRECATED: Use original_image_url instead';
COMMENT ON COLUMN public.image_brush_history.mask_image IS 'DEPRECATED: Use mask_image_url instead';

-- Note: In production, you may want to:
-- 1. Migrate existing data from base64 to URLs
-- 2. Drop the old columns after migration is complete
-- 3. Add NOT NULL constraints to new URL columns if required