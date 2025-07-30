-- Rollback script for Canvas AI database changes
-- Use this to remove Canvas AI specific additions

-- Step 1: Drop RLS policies
DROP POLICY IF EXISTS "Effect templates are viewable by everyone" ON public.effect_templates;
DROP POLICY IF EXISTS "Users can view their own video generations" ON public.video_generations;
DROP POLICY IF EXISTS "Users can create their own video generations" ON public.video_generations;
DROP POLICY IF EXISTS "Users can update their own video generations" ON public.video_generations;

-- Step 2: Drop indexes
DROP INDEX IF EXISTS idx_effect_templates_category;
DROP INDEX IF EXISTS idx_effect_templates_active;
DROP INDEX IF EXISTS idx_video_generations_user_id;
DROP INDEX IF EXISTS idx_video_generations_status;
DROP INDEX IF EXISTS idx_video_generations_created_at;

-- Step 3: Drop effect_templates table (this was created by our migration)
DROP TABLE IF EXISTS public.effect_templates CASCADE;

-- Step 4: Remove Canvas categories
DELETE FROM public.categories WHERE name IN ('effect', 'camera', 'model');

-- Note: video_generations table already existed, so we don't drop it

-- Verification
SELECT 'Rollback completed. Remaining Canvas-related objects:' as status;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('effect_templates', 'video_generations');

SELECT name 
FROM public.categories 
WHERE name IN ('effect', 'camera', 'model');