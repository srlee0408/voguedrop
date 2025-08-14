-- Add columns for grouping sound generations
ALTER TABLE sound_generations 
ADD COLUMN generation_group_id TEXT,
ADD COLUMN variation_number INTEGER CHECK (variation_number >= 1 AND variation_number <= 4);

-- Add index for group_id to improve query performance
CREATE INDEX idx_sound_generations_group_id ON sound_generations(generation_group_id);

-- Add composite index for user_id and generation_group_id
CREATE INDEX idx_sound_generations_user_group ON sound_generations(user_id, generation_group_id);

-- Add comment for new columns
COMMENT ON COLUMN sound_generations.generation_group_id IS 'Groups multiple variations generated from the same prompt';
COMMENT ON COLUMN sound_generations.variation_number IS 'Variation number within a group (1-4)';