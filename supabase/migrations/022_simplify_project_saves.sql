-- Migration: Simplify project_saves table structure
-- Created: 2025-01-19
-- Description: Remove versioning, add latest_video_url, add unique constraint

-- Step 1: Add latest_video_url column if it doesn't exist
ALTER TABLE project_saves 
ADD COLUMN IF NOT EXISTS latest_video_url TEXT;

-- Step 2: Add unique constraint for user_id + project_name
-- This ensures one project per name per user
DO $$
BEGIN
  -- Check if constraint already exists
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'unique_project_per_user'
      AND table_name = 'project_saves'
  ) THEN
    -- Before adding constraint, handle any duplicates
    -- Keep only the latest version for each project
    DELETE FROM project_saves p1
    WHERE EXISTS (
      SELECT 1 
      FROM project_saves p2 
      WHERE p2.user_id = p1.user_id 
        AND p2.project_name = p1.project_name
        AND p2.id > p1.id
    );
    
    -- Now add the unique constraint
    ALTER TABLE project_saves 
    ADD CONSTRAINT unique_project_per_user 
    UNIQUE (user_id, project_name);
    
    RAISE NOTICE 'Added unique constraint: unique_project_per_user';
  ELSE
    RAISE NOTICE 'Unique constraint unique_project_per_user already exists';
  END IF;
END $$;

-- Step 3: Drop version-related columns (if they exist)
-- These are no longer needed with the simplified approach
DO $$
BEGIN
  -- Drop version column if exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'project_saves' 
      AND column_name = 'version'
  ) THEN
    ALTER TABLE project_saves DROP COLUMN version;
    RAISE NOTICE 'Dropped column: version';
  END IF;
  
  -- Drop is_latest column if exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'project_saves' 
      AND column_name = 'is_latest'
  ) THEN
    ALTER TABLE project_saves DROP COLUMN is_latest;
    RAISE NOTICE 'Dropped column: is_latest';
  END IF;
END $$;

-- Step 4: Create index on latest_video_url for faster queries
CREATE INDEX IF NOT EXISTS idx_project_saves_latest_video_url 
ON project_saves(latest_video_url) 
WHERE latest_video_url IS NOT NULL;

-- Step 5: Create composite index for faster lookups
CREATE INDEX IF NOT EXISTS idx_project_saves_user_project 
ON project_saves(user_id, project_name);

-- Step 6: Update comments
COMMENT ON COLUMN project_saves.latest_video_url IS 'URL of the latest rendered video stored in Supabase Storage';
COMMENT ON TABLE project_saves IS 'Stores the current state of video projects (single record per project)';

-- Step 7: Migrate existing data (if needed)
-- If there are multiple versions of the same project, keep only the latest
DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  -- Count duplicates before cleanup
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT user_id, project_name, COUNT(*) as cnt
    FROM project_saves
    GROUP BY user_id, project_name
    HAVING COUNT(*) > 1
  ) duplicates;
  
  IF duplicate_count > 0 THEN
    RAISE NOTICE 'Found % duplicate project(s). Keeping only the latest version of each.', duplicate_count;
    
    -- Keep only the record with the highest ID (most recent) for each project
    DELETE FROM project_saves p1
    WHERE EXISTS (
      SELECT 1 
      FROM project_saves p2 
      WHERE p2.user_id = p1.user_id 
        AND p2.project_name = p1.project_name
        AND p2.id > p1.id
    );
  END IF;
END $$;

-- Step 8: Verify the migration
DO $$
DECLARE
  has_latest_video_url BOOLEAN;
  has_unique_constraint BOOLEAN;
  has_version_column BOOLEAN;
  has_is_latest_column BOOLEAN;
BEGIN
  -- Check if latest_video_url exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'project_saves' 
      AND column_name = 'latest_video_url'
  ) INTO has_latest_video_url;
  
  -- Check if unique constraint exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'unique_project_per_user'
      AND table_name = 'project_saves'
  ) INTO has_unique_constraint;
  
  -- Check if old columns are removed
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'project_saves' 
      AND column_name = 'version'
  ) INTO has_version_column;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'project_saves' 
      AND column_name = 'is_latest'
  ) INTO has_is_latest_column;
  
  -- Report results
  IF has_latest_video_url AND has_unique_constraint 
     AND NOT has_version_column AND NOT has_is_latest_column THEN
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE '✓ latest_video_url column added';
    RAISE NOTICE '✓ unique_project_per_user constraint added';
    RAISE NOTICE '✓ version column removed';
    RAISE NOTICE '✓ is_latest column removed';
  ELSE
    RAISE WARNING 'Migration may not have completed fully. Please check:';
    IF NOT has_latest_video_url THEN
      RAISE WARNING '✗ latest_video_url column missing';
    END IF;
    IF NOT has_unique_constraint THEN
      RAISE WARNING '✗ unique_project_per_user constraint missing';
    END IF;
    IF has_version_column THEN
      RAISE WARNING '✗ version column still exists';
    END IF;
    IF has_is_latest_column THEN
      RAISE WARNING '✗ is_latest column still exists';
    END IF;
  END IF;
END $$;