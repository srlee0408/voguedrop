-- Add Canvas AI categories
-- Created: 2025-01-30

-- Insert Canvas-related categories
-- Using INSERT ... ON CONFLICT to ensure idempotency
INSERT INTO public.categories (name) VALUES 
  ('effect'),   -- Visual effects like dreamy, vintage, etc.
  ('camera'),   -- Camera movements like zoom, pan, etc.
  ('model')     -- Model behaviors like walk, pose, etc.
ON CONFLICT (name) DO NOTHING;

-- Add comments for documentation
COMMENT ON COLUMN public.categories.name IS 'Category name. Canvas AI uses: effect, camera, model';