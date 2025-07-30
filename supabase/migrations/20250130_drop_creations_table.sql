-- Drop creations table after migrating data to effect_templates
-- Created: 2025-01-30

-- First, verify that data has been migrated
DO $$
DECLARE
  creation_count integer;
  effect_template_count integer;
BEGIN
  SELECT COUNT(*) INTO creation_count FROM public.creations;
  SELECT COUNT(*) INTO effect_template_count 
  FROM public.effect_templates 
  WHERE preview_media_id IN (SELECT product_id FROM public.creations);
  
  IF creation_count > 0 AND effect_template_count = 0 THEN
    RAISE EXCEPTION 'Data has not been migrated from creations to effect_templates. Run 20250130_migrate_creations_to_effect_templates.sql first.';
  END IF;
END $$;

-- Drop RLS policies for creations table
DROP POLICY IF EXISTS "Creations are viewable by everyone" ON public.creations;

-- Drop the creations table
DROP TABLE IF EXISTS public.creations CASCADE;

-- Verification
DO $$
BEGIN
  RAISE NOTICE 'Successfully dropped creations table';
END $$;