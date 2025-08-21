-- Phase 4: Final UUID Migration - THE POINT OF NO RETURN (v2)
-- WARNING: THIS SCRIPT IS DESTRUCTIVE AND PERMANENTLY ALTERS THE DATABASE SCHEMA.
-- DO NOT RUN ON PRODUCTION WITHOUT A FULL BACKUP AND THOROUGH TESTING IN A STAGING ENVIRONMENT.

-- v2: Added CASCADE to handle view dependency on image_brush_history.id and re-creates the view.

BEGIN;

-- Step 1: Drop all Foreign Key constraints that depend on the old integer IDs.
-------------------------------------------------------------------------------------

-- Drop FK from video_renders to project_saves
ALTER TABLE IF EXISTS public.video_renders DROP CONSTRAINT IF EXISTS video_renders_project_save_id_fkey;

-- Drop FK from effect_templates to categories
ALTER TABLE IF EXISTS public.effect_templates DROP CONSTRAINT IF EXISTS effect_templates_category_id_fkey;

-- Drop FK from effect_templates to media_assets
ALTER TABLE IF EXISTS public.effect_templates DROP CONSTRAINT IF EXISTS effect_templates_preview_media_id_fkey;


-- Step 2: For each table, drop the old PK, drop the old integer 'id' column, rename the new 'id_uuid' column to 'id', and set it as the new PK.
------------------------------------------------------------------------------------------------------------------------------------------

-- Table: categories
ALTER TABLE IF EXISTS public.categories DROP CONSTRAINT IF EXISTS categories_pkey CASCADE;
ALTER TABLE IF EXISTS public.categories DROP COLUMN IF EXISTS id;
ALTER TABLE IF EXISTS public.categories RENAME COLUMN id_uuid TO id;
ALTER TABLE IF EXISTS public.categories ADD PRIMARY KEY (id);

-- Table: effect_templates
ALTER TABLE IF EXISTS public.effect_templates DROP CONSTRAINT IF EXISTS effect_templates_pkey CASCADE;
ALTER TABLE IF EXISTS public.effect_templates DROP COLUMN IF EXISTS id;
ALTER TABLE IF EXISTS public.effect_templates RENAME COLUMN id_uuid TO id;
ALTER TABLE IF EXISTS public.effect_templates ADD PRIMARY KEY (id);
ALTER TABLE IF EXISTS public.effect_templates DROP COLUMN IF EXISTS category_id;
ALTER TABLE IF EXISTS public.effect_templates RENAME COLUMN category_id_uuid TO category_id;
ALTER TABLE IF EXISTS public.effect_templates DROP COLUMN IF EXISTS preview_media_id;
ALTER TABLE IF EXISTS public.effect_templates RENAME COLUMN preview_media_id_uuid TO preview_media_id;

-- Table: image_brush_history
ALTER TABLE IF EXISTS public.image_brush_history DROP CONSTRAINT IF EXISTS image_brush_history_pkey CASCADE;
ALTER TABLE IF EXISTS public.image_brush_history DROP COLUMN IF EXISTS id CASCADE; -- Use CASCADE to drop dependent views
ALTER TABLE IF EXISTS public.image_brush_history RENAME COLUMN id_uuid TO id;
ALTER TABLE IF EXISTS public.image_brush_history ADD PRIMARY KEY (id);

-- Table: project_saves (Special case: project_uuid becomes the new id)
ALTER TABLE IF EXISTS public.project_saves DROP CONSTRAINT IF EXISTS project_saves_pkey CASCADE;
ALTER TABLE IF EXISTS public.project_saves DROP COLUMN IF EXISTS id;
ALTER TABLE IF EXISTS public.project_saves RENAME COLUMN project_uuid TO id;
ALTER TABLE IF EXISTS public.project_saves ADD PRIMARY KEY (id);

-- Table: sound_generations
ALTER TABLE IF EXISTS public.sound_generations DROP CONSTRAINT IF EXISTS sound_generations_pkey CASCADE;
ALTER TABLE IF EXISTS public.sound_generations DROP COLUMN IF EXISTS id;
ALTER TABLE IF EXISTS public.sound_generations RENAME COLUMN id_uuid TO id;
ALTER TABLE IF EXISTS public.sound_generations ADD PRIMARY KEY (id);

-- Table: user_uploaded_music
ALTER TABLE IF EXISTS public.user_uploaded_music DROP CONSTRAINT IF EXISTS user_uploaded_music_pkey CASCADE;
ALTER TABLE IF EXISTS public.user_uploaded_music DROP COLUMN IF EXISTS id;
ALTER TABLE IF EXISTS public.user_uploaded_music RENAME COLUMN id_uuid TO id;
ALTER TABLE IF EXISTS public.user_uploaded_music ADD PRIMARY KEY (id);

-- Table: user_uploaded_videos
ALTER TABLE IF EXISTS public.user_uploaded_videos DROP CONSTRAINT IF EXISTS user_uploaded_videos_pkey CASCADE;
ALTER TABLE IF EXISTS public.user_uploaded_videos DROP COLUMN IF EXISTS id;
ALTER TABLE IF EXISTS public.user_uploaded_videos RENAME COLUMN id_uuid TO id;
ALTER TABLE IF EXISTS public.user_uploaded_videos ADD PRIMARY KEY (id);

-- Table: video_generations
ALTER TABLE IF EXISTS public.video_generations DROP CONSTRAINT IF EXISTS video_generations_pkey CASCADE;
ALTER TABLE IF EXISTS public.video_generations DROP COLUMN IF EXISTS id;
ALTER TABLE IF EXISTS public.video_generations RENAME COLUMN id_uuid TO id;
ALTER TABLE IF EXISTS public.video_generations ADD PRIMARY KEY (id);

-- Table: video_renders
ALTER TABLE IF EXISTS public.video_renders DROP CONSTRAINT IF EXISTS video_renders_pkey CASCADE;
ALTER TABLE IF EXISTS public.video_renders DROP COLUMN IF EXISTS id;
ALTER TABLE IF EXISTS public.video_renders RENAME COLUMN id_uuid TO id;
ALTER TABLE IF EXISTS public.video_renders ADD PRIMARY KEY (id);
ALTER TABLE IF EXISTS public.video_renders DROP COLUMN IF EXISTS project_save_id;
ALTER TABLE IF EXISTS public.video_renders RENAME COLUMN project_save_id_uuid TO project_save_id;

-- Table: media_assets
ALTER TABLE IF EXISTS public.media_assets DROP CONSTRAINT IF EXISTS media_assets_pkey CASCADE;
ALTER TABLE IF EXISTS public.media_assets DROP COLUMN IF EXISTS id;
ALTER TABLE IF EXISTS public.media_assets RENAME COLUMN id_uuid TO id;
ALTER TABLE IF EXISTS public.media_assets ADD PRIMARY KEY (id);


-- Step 3: Re-create the Foreign Key constraints using the new UUID columns.
--------------------------------------------------------------------------------

-- Re-create FK for effect_templates -> categories
ALTER TABLE public.effect_templates 
ADD CONSTRAINT effect_templates_category_id_fkey 
FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE;

-- Re-create FK for effect_templates -> media_assets
ALTER TABLE public.effect_templates 
ADD CONSTRAINT effect_templates_preview_media_id_fkey 
FOREIGN KEY (preview_media_id) REFERENCES public.media_assets(id) ON DELETE SET NULL;

-- Re-create FK for video_renders -> project_saves
ALTER TABLE public.video_renders 
ADD CONSTRAINT video_renders_project_save_id_fkey 
FOREIGN KEY (project_save_id) REFERENCES public.project_saves(id) ON DELETE SET NULL;


-- Step 4: Re-create the view that was dropped by the CASCADE operation.
--------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.image_brush_i2i_history AS
SELECT 
  id, -- This is now the new UUID id
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


COMMIT;