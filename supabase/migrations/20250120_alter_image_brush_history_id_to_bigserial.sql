-- Alter image_brush_history table to change id from UUID to BIGSERIAL
-- This migration preserves existing data while changing the primary key type

-- Step 1: Add a temporary BIGSERIAL column
ALTER TABLE public.image_brush_history 
ADD COLUMN id_new BIGSERIAL;

-- Step 2: Drop the old primary key constraint
ALTER TABLE public.image_brush_history 
DROP CONSTRAINT image_brush_history_pkey;

-- Step 3: Drop the old id column
ALTER TABLE public.image_brush_history 
DROP COLUMN id;

-- Step 4: Rename the new column to id
ALTER TABLE public.image_brush_history 
RENAME COLUMN id_new TO id;

-- Step 5: Add primary key constraint to the new id column
ALTER TABLE public.image_brush_history 
ADD PRIMARY KEY (id);

-- Step 6: Update the sequence to start from the next value after existing records
-- This ensures no conflicts with future inserts
SELECT setval(
  pg_get_serial_sequence('public.image_brush_history', 'id'),
  COALESCE((SELECT MAX(id) FROM public.image_brush_history), 0) + 1,
  false
);

-- Add comment to reflect the change
COMMENT ON COLUMN public.image_brush_history.id IS 'Auto-incrementing primary key (changed from UUID to BIGSERIAL)';