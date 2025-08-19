-- Migration: Add foreign key constraint to project_saves.latest_render_id
-- Created: 2025-01-19
-- Description: Adds foreign key relationship between project_saves and video_renders tables

-- Step 1: Clean up any orphaned render_ids that don't exist in video_renders
-- This ensures existing data won't violate the foreign key constraint
UPDATE project_saves 
SET latest_render_id = NULL 
WHERE latest_render_id IS NOT NULL 
  AND latest_render_id NOT IN (
    SELECT render_id 
    FROM video_renders 
    WHERE render_id IS NOT NULL
  );

-- Log how many records were cleaned up (optional)
DO $$
DECLARE
  cleaned_count INTEGER;
BEGIN
  GET DIAGNOSTICS cleaned_count = ROW_COUNT;
  IF cleaned_count > 0 THEN
    RAISE NOTICE 'Cleaned up % orphaned render_id references', cleaned_count;
  END IF;
END $$;

-- Step 2: Add the foreign key constraint
-- Use IF NOT EXISTS to make the migration idempotent
DO $$
BEGIN
  -- Check if the foreign key constraint already exists
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'project_saves_latest_render_id_fkey'
      AND table_name = 'project_saves'
  ) THEN
    -- Add foreign key constraint with ON DELETE SET NULL
    -- This ensures that if a render is deleted, the reference is set to NULL
    ALTER TABLE project_saves 
    ADD CONSTRAINT project_saves_latest_render_id_fkey 
    FOREIGN KEY (latest_render_id) 
    REFERENCES video_renders(render_id) 
    ON DELETE SET NULL
    ON UPDATE CASCADE;
    
    RAISE NOTICE 'Foreign key constraint project_saves_latest_render_id_fkey added successfully';
  ELSE
    RAISE NOTICE 'Foreign key constraint project_saves_latest_render_id_fkey already exists';
  END IF;
END $$;

-- Step 3: Create index on latest_render_id for better join performance (if not exists)
CREATE INDEX IF NOT EXISTS idx_project_saves_latest_render_id 
ON project_saves(latest_render_id) 
WHERE latest_render_id IS NOT NULL;

-- Step 4: Add comment to document the relationship
COMMENT ON CONSTRAINT project_saves_latest_render_id_fkey ON project_saves 
IS 'Foreign key ensuring latest_render_id references a valid render in video_renders table';

-- Step 5: Verify the constraint was created successfully
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'project_saves_latest_render_id_fkey'
      AND table_name = 'project_saves'
  ) THEN
    RAISE NOTICE 'Migration completed successfully: Foreign key constraint is active';
  ELSE
    RAISE EXCEPTION 'Migration failed: Foreign key constraint was not created';
  END IF;
END $$;

-- Additional safety check: Ensure render_id in video_renders is unique
-- This should already be the case, but let's verify
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints 
    WHERE constraint_type = 'UNIQUE'
      AND table_name = 'video_renders'
      AND constraint_name LIKE '%render_id%'
  ) THEN
    -- If no unique constraint exists, check if there are duplicates
    IF EXISTS (
      SELECT render_id, COUNT(*)
      FROM video_renders
      WHERE render_id IS NOT NULL
      GROUP BY render_id
      HAVING COUNT(*) > 1
    ) THEN
      RAISE WARNING 'Duplicate render_ids found in video_renders table. Please clean up before adding unique constraint.';
    ELSE
      -- Add unique constraint if no duplicates exist
      ALTER TABLE video_renders 
      ADD CONSTRAINT video_renders_render_id_unique 
      UNIQUE (render_id);
      
      RAISE NOTICE 'Added unique constraint on video_renders.render_id';
    END IF;
  END IF;
END $$;