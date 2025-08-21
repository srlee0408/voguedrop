-- Migration: Add UUID-based project identification
-- Created: 2025-01-21
-- Description: Add project_uuid for secure project identification and allow project name changes

-- Step 1: Add project_uuid column
ALTER TABLE project_saves 
ADD COLUMN IF NOT EXISTS project_uuid UUID DEFAULT gen_random_uuid() NOT NULL;

-- Step 2: Create unique index on project_uuid
CREATE UNIQUE INDEX IF NOT EXISTS idx_project_saves_project_uuid 
ON project_saves(project_uuid);

-- Step 3: Update existing records with UUIDs (if any don't have them)
UPDATE project_saves 
SET project_uuid = gen_random_uuid() 
WHERE project_uuid IS NULL;

-- Step 4: Remove the unique constraint on user_id + project_name
-- This allows users to rename projects without creating duplicates
DO $$
BEGIN
  -- Check if constraint exists and drop it
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'unique_project_per_user'
      AND table_name = 'project_saves'
  ) THEN
    ALTER TABLE project_saves 
    DROP CONSTRAINT unique_project_per_user;
    
    RAISE NOTICE 'Dropped constraint: unique_project_per_user';
  ELSE
    RAISE NOTICE 'Constraint unique_project_per_user does not exist';
  END IF;
END $$;

-- Step 5: Add new constraint to prevent duplicate UUIDs (should be redundant with unique index)
ALTER TABLE project_saves 
ADD CONSTRAINT unique_project_uuid 
UNIQUE (project_uuid);

-- Step 6: Create composite index for faster user queries
CREATE INDEX IF NOT EXISTS idx_project_saves_user_uuid 
ON project_saves(user_id, project_uuid);

-- Step 7: Add comments
COMMENT ON COLUMN project_saves.project_uuid IS 'Unique UUID identifier for the project, used for secure URL routing';
COMMENT ON INDEX idx_project_saves_project_uuid IS 'Unique index for project UUID lookup';

-- Step 8: Verify migration
DO $$
DECLARE
  has_uuid_column BOOLEAN;
  has_uuid_index BOOLEAN;
  has_old_constraint BOOLEAN;
  has_new_constraint BOOLEAN;
  uuid_count INTEGER;
  total_count INTEGER;
BEGIN
  -- Check if project_uuid column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'project_saves' 
      AND column_name = 'project_uuid'
  ) INTO has_uuid_column;
  
  -- Check if unique index exists
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'project_saves' 
      AND indexname = 'idx_project_saves_project_uuid'
  ) INTO has_uuid_index;
  
  -- Check if old constraint was removed
  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'unique_project_per_user'
      AND table_name = 'project_saves'
  ) INTO has_old_constraint;
  
  -- Check if new constraint exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'unique_project_uuid'
      AND table_name = 'project_saves'
  ) INTO has_new_constraint;
  
  -- Count records with UUIDs
  SELECT COUNT(*) FROM project_saves WHERE project_uuid IS NOT NULL INTO uuid_count;
  SELECT COUNT(*) FROM project_saves INTO total_count;
  
  -- Report results
  IF has_uuid_column AND has_uuid_index AND NOT has_old_constraint AND has_new_constraint THEN
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE '✓ project_uuid column added';
    RAISE NOTICE '✓ unique index created';
    RAISE NOTICE '✓ old unique constraint removed';
    RAISE NOTICE '✓ new UUID constraint added';
    RAISE NOTICE '✓ % out of % records have UUIDs', uuid_count, total_count;
  ELSE
    RAISE WARNING 'Migration may not have completed fully. Please check:';
    IF NOT has_uuid_column THEN
      RAISE WARNING '✗ project_uuid column missing';
    END IF;
    IF NOT has_uuid_index THEN
      RAISE WARNING '✗ unique index missing';
    END IF;
    IF has_old_constraint THEN
      RAISE WARNING '✗ old unique constraint still exists';
    END IF;
    IF NOT has_new_constraint THEN
      RAISE WARNING '✗ new UUID constraint missing';
    END IF;
    IF uuid_count != total_count THEN
      RAISE WARNING '✗ some records missing UUIDs: % out of %', uuid_count, total_count;
    END IF;
  END IF;
END $$;