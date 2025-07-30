-- Canvas AI Effect Templates Seed Data
-- Created: 2025-01-30

-- Note: This script assumes categories have been created by the migration

-- Camera Effects
INSERT INTO public.effect_templates (name, category_id, prompt, display_order, preview_media_id) 
SELECT 
  effect.name,
  c.id as category_id,
  effect.prompt,
  effect.display_order,
  NULL as preview_media_id -- Placeholder, will be updated when preview videos are available
FROM (VALUES
  ('Zoom In', 'camera slowly zooming in, smooth zoom motion', 1),
  ('Pan Left', 'camera panning left, horizontal camera movement', 2),
  ('Pan Right', 'camera panning right, smooth right motion', 3),
  ('Zoom Out', 'camera zooming out, revealing wider view', 4),
  ('Rotate Clockwise', 'camera rotating clockwise, spinning motion', 5),
  ('Tilt Up', 'camera tilting upward, vertical motion', 6)
) AS effect(name, prompt, display_order)
CROSS JOIN public.categories c
WHERE c.name = 'camera'
ON CONFLICT (name, category_id) DO UPDATE SET
  prompt = EXCLUDED.prompt,
  display_order = EXCLUDED.display_order;

-- Visual Effects
INSERT INTO public.effect_templates (name, category_id, prompt, display_order, preview_media_id) 
SELECT 
  effect.name,
  c.id as category_id,
  effect.prompt,
  effect.display_order,
  NULL as preview_media_id
FROM (VALUES
  ('Dreamy', 'dreamy ethereal atmosphere, soft focus, magical feeling', 1),
  ('Vintage', 'vintage film look, retro aesthetic, nostalgic mood', 2),
  ('Neon', 'neon lights effect, cyberpunk style, glowing colors', 3),
  ('Golden Hour', 'golden hour lighting, warm sunset glow, cinematic', 4),
  ('Black & White', 'classic black and white, high contrast, dramatic', 5),
  ('Blur Motion', 'motion blur effect, dynamic movement, speed', 6)
) AS effect(name, prompt, display_order)
CROSS JOIN public.categories c
WHERE c.name = 'effect'
ON CONFLICT (name, category_id) DO UPDATE SET
  prompt = EXCLUDED.prompt,
  display_order = EXCLUDED.display_order;

-- Model Effects
INSERT INTO public.effect_templates (name, category_id, prompt, display_order, preview_media_id) 
SELECT 
  effect.name,
  c.id as category_id,
  effect.prompt,
  effect.display_order,
  NULL as preview_media_id
FROM (VALUES
  ('Fashion Walk', 'model walking on runway, confident stride, fashion show', 1),
  ('Pose Change', 'model changing poses, dynamic posing, fashion editorial', 2),
  ('Hair Flow', 'hair flowing in wind, dramatic hair movement, glamorous', 3),
  ('Turn Around', 'model turning around, 360 degree spin, showcase outfit', 4),
  ('Smile', 'model smiling naturally, warm expression, friendly', 5),
  ('Dance Move', 'model dancing gracefully, rhythmic movement, energetic', 6)
) AS effect(name, prompt, display_order)
CROSS JOIN public.categories c
WHERE c.name = 'model'
ON CONFLICT (name, category_id) DO UPDATE SET
  prompt = EXCLUDED.prompt,
  display_order = EXCLUDED.display_order;