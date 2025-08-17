-- Migration: Transfer data from creations to effect_templates
-- Created: 2025-01-30

-- First, insert the creations data into effect_templates
-- We'll map product_id to preview_media_id
INSERT INTO public.effect_templates (name, category_id, prompt, preview_media_id, display_order, is_active)
SELECT 
  c.title as name,
  c.category_id,
  c.prompt,
  c.product_id as preview_media_id,
  ROW_NUMBER() OVER (PARTITION BY c.category_id ORDER BY c.created_at) as display_order,
  true as is_active
FROM public.creations c
WHERE c.title IS NOT NULL
ON CONFLICT (name, category_id) DO UPDATE SET
  prompt = EXCLUDED.prompt,
  preview_media_id = EXCLUDED.preview_media_id,
  display_order = EXCLUDED.display_order;

-- Log the migration for verification
DO $$
DECLARE
  migrated_count integer;
BEGIN
  SELECT COUNT(*) INTO migrated_count
  FROM public.effect_templates
  WHERE preview_media_id IN (SELECT product_id FROM public.creations);
  
  RAISE NOTICE 'Migrated % records from creations to effect_templates', migrated_count;
END $$;

-- Note: We're not dropping the creations table yet to ensure data safety
-- After verifying the migration, you can drop it with:
-- DROP TABLE IF EXISTS public.creations CASCADE;