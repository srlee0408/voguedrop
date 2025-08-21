-- Phase 3: UUID Migration - Step 2 (Corrected v2)
-- Backfill the new UUID columns with UUIDv4 values using the built-in gen_random_uuid().
-- v2: Correctly backfills media_assets.id_uuid.

-- 1. Backfill independent tables first
--------------------------------------------------

-- Backfill 'categories'
UPDATE public.categories
SET id_uuid = gen_random_uuid()
WHERE id_uuid IS NULL;

-- Backfill 'media_assets'
UPDATE public.media_assets
SET id_uuid = gen_random_uuid()
WHERE id_uuid IS NULL;

-- Backfill 'image_brush_history'
UPDATE public.image_brush_history
SET id_uuid = gen_random_uuid()
WHERE id_uuid IS NULL;

-- Backfill 'project_saves' (uses project_uuid as its target UUID PK)
UPDATE public.project_saves
SET project_uuid = gen_random_uuid()
WHERE project_uuid IS NULL;

-- Backfill 'sound_generations'
UPDATE public.sound_generations
SET id_uuid = gen_random_uuid()
WHERE id_uuid IS NULL;

-- Backfill 'user_uploaded_music'
UPDATE public.user_uploaded_music
SET id_uuid = gen_random_uuid()
WHERE id_uuid IS NULL;

-- Backfill 'user_uploaded_videos'
UPDATE public.user_uploaded_videos
SET id_uuid = gen_random_uuid()
WHERE id_uuid IS NULL;

-- Backfill 'video_generation_logs'
UPDATE public.video_generation_logs
SET id_uuid = gen_random_uuid()
WHERE id_uuid IS NULL;

-- Backfill 'video_generations'
UPDATE public.video_generations
SET id_uuid = gen_random_uuid()
WHERE id_uuid IS NULL;


-- 2. Backfill dependent tables
--------------------------------------------------

-- Backfill 'effect_templates' PK
UPDATE public.effect_templates
SET id_uuid = gen_random_uuid()
WHERE id_uuid IS NULL;

-- Backfill 'effect_templates' FKs by joining with parent tables
UPDATE public.effect_templates et
SET category_id_uuid = c.id_uuid
FROM public.categories c
WHERE et.category_id = c.id AND et.category_id_uuid IS NULL;

UPDATE public.effect_templates et
SET preview_media_id_uuid = ma.id_uuid
FROM public.media_assets ma
WHERE et.preview_media_id = ma.id AND et.preview_media_id_uuid IS NULL;


-- Backfill 'video_renders' PK
UPDATE public.video_renders
SET id_uuid = gen_random_uuid()
WHERE id_uuid IS NULL;

-- Backfill 'video_renders' FK for project_save_id
UPDATE public.video_renders vr
SET project_save_id_uuid = ps.project_uuid -- Note: project_saves uses project_uuid
FROM public.project_saves ps
WHERE vr.project_save_id = ps.id AND vr.project_save_id_uuid IS NULL;
