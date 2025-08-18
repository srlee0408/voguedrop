-- Add generation_type column to sound_generations table
ALTER TABLE sound_generations 
ADD COLUMN IF NOT EXISTS generation_type text DEFAULT 'sound_effect';

-- Add CHECK constraint for generation_type values
ALTER TABLE sound_generations 
ADD CONSTRAINT sound_generations_generation_type_check 
CHECK (generation_type IN ('sound_effect', 'music', 'from_video'));

-- Drop the old duration constraint
ALTER TABLE sound_generations 
DROP CONSTRAINT IF EXISTS sound_generations_duration_seconds_check;

-- Add new constraint that allows 32 seconds for music type
ALTER TABLE sound_generations 
ADD CONSTRAINT sound_generations_duration_seconds_type_check 
CHECK (
  (generation_type = 'music' AND duration_seconds = 32) OR
  (generation_type IN ('sound_effect', 'from_video') AND duration_seconds >= 1 AND duration_seconds <= 22)
);

-- Update existing records to have the correct generation_type
UPDATE sound_generations 
SET generation_type = 'sound_effect' 
WHERE generation_type IS NULL;