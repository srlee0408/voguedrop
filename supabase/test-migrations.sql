-- Test script for Canvas AI database migrations
-- Run this after applying migrations to verify setup

-- Test 1: Verify tables exist
SELECT 'Testing table existence...' as test;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('effect_templates', 'video_generations');

-- Test 2: Verify categories were created
SELECT 'Testing categories...' as test;
SELECT name 
FROM public.categories 
WHERE name IN ('effect', 'camera', 'model');

-- Test 3: Verify effect_templates structure
SELECT 'Testing effect_templates structure...' as test;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'effect_templates'
ORDER BY ordinal_position;

-- Test 4: Verify video_generations structure
SELECT 'Testing video_generations structure...' as test;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'video_generations'
ORDER BY ordinal_position;

-- Test 5: Verify RLS is enabled
SELECT 'Testing RLS policies...' as test;
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('effect_templates', 'video_generations');

-- Test 6: Verify seed data
SELECT 'Testing seed data...' as test;
SELECT c.name as category, COUNT(et.id) as effect_count
FROM public.categories c
LEFT JOIN public.effect_templates et ON c.id = et.category_id
WHERE c.name IN ('effect', 'camera', 'model')
GROUP BY c.name
ORDER BY c.name;

-- Test 7: Sample effect templates
SELECT 'Sample effect templates...' as test;
SELECT et.name, c.name as category, et.prompt
FROM public.effect_templates et
JOIN public.categories c ON et.category_id = c.id
ORDER BY c.name, et.display_order
LIMIT 9;