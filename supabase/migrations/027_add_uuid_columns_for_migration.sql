-- Phase 3: UUID Migration - Step 1 (Corrected v2)
-- Add new UUID columns to all target tables for gradual migration.
-- v2: Added missing ALTER TABLE for media_assets.

-- We will use the built-in 'gen_random_uuid()' function.

-- 1. Add UUID columns to 'categories'
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS id_uuid UUID;

-- Add UUID column to 'media_assets' (This was missing)
ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS id_uuid UUID;

-- 2. Add UUID columns to 'effect_templates'
ALTER TABLE public.effect_templates ADD COLUMN IF NOT EXISTS id_uuid UUID;
ALTER TABLE public.effect_templates ADD COLUMN IF NOT EXISTS category_id_uuid UUID;
ALTER TABLE public.effect_templates ADD COLUMN IF NOT EXISTS preview_media_id_uuid UUID;

-- 3. Add UUID column to 'image_brush_history'
ALTER TABLE public.image_brush_history ADD COLUMN IF NOT EXISTS id_uuid UUID;

-- 4. Add UUID column to 'project_saves'
ALTER TABLE public.project_saves ADD COLUMN IF NOT EXISTS project_uuid UUID;

-- 5. Add UUID columns to 'sound_generations'
ALTER TABLE public.sound_generations ADD COLUMN IF NOT EXISTS id_uuid UUID;

-- 6. Add UUID columns to 'user_uploaded_music'
ALTER TABLE public.user_uploaded_music ADD COLUMN IF NOT EXISTS id_uuid UUID;

-- 7. Add UUID columns to 'user_uploaded_videos'
ALTER TABLE public.user_uploaded_videos ADD COLUMN IF NOT EXISTS id_uuid UUID;

-- 9. Add UUID columns to 'video_generations'
ALTER TABLE public.video_generations ADD COLUMN IF NOT EXISTS id_uuid UUID;

-- 10. Add UUID columns to 'video_renders'
ALTER TABLE public.video_renders ADD COLUMN IF NOT EXISTS id_uuid UUID;
ALTER TABLE public.video_renders ADD COLUMN IF NOT EXISTS project_save_id_uuid UUID;
