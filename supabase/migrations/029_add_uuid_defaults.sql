-- Phase 3: UUID Migration - Step 2.5 (Correction)
-- Add default gen_random_uuid() to all new UUID columns.
-- This ensures that the database automatically generates a UUID for new records.

-- 1. Add default to 'categories'
ALTER TABLE public.categories ALTER COLUMN id_uuid SET DEFAULT gen_random_uuid();

-- 1.1. Add default to 'media_assets'
ALTER TABLE public.media_assets ALTER COLUMN id_uuid SET DEFAULT gen_random_uuid();

-- 2. Add default to 'effect_templates'
ALTER TABLE public.effect_templates ALTER COLUMN id_uuid SET DEFAULT gen_random_uuid();

-- 3. Add default to 'image_brush_history'
ALTER TABLE public.image_brush_history ALTER COLUMN id_uuid SET DEFAULT gen_random_uuid();

-- 4. Add default to 'project_saves' (project_uuid)
ALTER TABLE public.project_saves ALTER COLUMN project_uuid SET DEFAULT gen_random_uuid();

-- 5. Add default to 'sound_generations'
ALTER TABLE public.sound_generations ALTER COLUMN id_uuid SET DEFAULT gen_random_uuid();

-- 6. Add default to 'user_uploaded_music'
ALTER TABLE public.user_uploaded_music ALTER COLUMN id_uuid SET DEFAULT gen_random_uuid();

-- 7. Add default to 'user_uploaded_videos'
ALTER TABLE public.user_uploaded_videos ALTER COLUMN id_uuid SET DEFAULT gen_random_uuid();

-- 8. Add default to 'video_generations'
ALTER TABLE public.video_generations ALTER COLUMN id_uuid SET DEFAULT gen_random_uuid();

-- 9. Add default to 'video_renders'
ALTER TABLE public.video_renders ALTER COLUMN id_uuid SET DEFAULT gen_random_uuid();

-- Note: Foreign key UUID columns (e.g., category_id_uuid) do not get a default value
-- as they must be explicitly provided by the application during inserts/updates.
