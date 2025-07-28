-- Migration 005: Insert Sample Data
-- Created: 2025-07-28
-- Description: Insert sample data for testing and development

-- Insert categories
INSERT INTO public.categories (name, description) VALUES 
('Digital Fashion', 'AI-generated and digital fashion designs'),
('Street Style', 'Urban and streetwear fashion styles'),
('Vintage', 'Retro and vintage-inspired fashion'),
('Y2K', '2000s-inspired fashion trends'),
('Minimalist', 'Clean and minimal fashion aesthetics')
ON CONFLICT DO NOTHING;

-- Insert sample media assets
-- Note: Make sure these files exist in your storage bucket
INSERT INTO public.media_assets (storage_path, file_name, media_type) VALUES 
('camera/sample1.jpg', 'sample1', 'image/jpeg'),
('camera/sample2.jpg', 'sample2', 'image/jpeg'),
('camera/sample3.jpg', 'sample3', 'image/jpeg')
ON CONFLICT DO NOTHING;

-- Insert sample creations
-- Note: This uses subqueries to get the correct IDs
INSERT INTO public.creations (title, prompt, category_id, product_id) 
SELECT 
    'Neon Dreams',
    'Futuristic fashion with neon accents',
    (SELECT id FROM public.categories WHERE name = 'Digital Fashion' LIMIT 1),
    (SELECT id FROM public.media_assets WHERE file_name = 'sample1' LIMIT 1)
WHERE EXISTS (SELECT 1 FROM public.categories WHERE name = 'Digital Fashion')
  AND EXISTS (SELECT 1 FROM public.media_assets WHERE file_name = 'sample1')
ON CONFLICT DO NOTHING;

INSERT INTO public.creations (title, prompt, category_id, product_id) 
SELECT 
    'Urban Explorer',
    'Street style meets high fashion',
    (SELECT id FROM public.categories WHERE name = 'Street Style' LIMIT 1),
    (SELECT id FROM public.media_assets WHERE file_name = 'sample2' LIMIT 1)
WHERE EXISTS (SELECT 1 FROM public.categories WHERE name = 'Street Style')
  AND EXISTS (SELECT 1 FROM public.media_assets WHERE file_name = 'sample2')
ON CONFLICT DO NOTHING;

INSERT INTO public.creations (title, prompt, category_id, product_id) 
SELECT 
    'Retro Revival',
    'Vintage aesthetics with modern twist',
    (SELECT id FROM public.categories WHERE name = 'Vintage' LIMIT 1),
    (SELECT id FROM public.media_assets WHERE file_name = 'sample3' LIMIT 1)
WHERE EXISTS (SELECT 1 FROM public.categories WHERE name = 'Vintage')
  AND EXISTS (SELECT 1 FROM public.media_assets WHERE file_name = 'sample3')
ON CONFLICT DO NOTHING;