-- Migration 003: Add Public Read Access Policies
-- Created: 2025-07-28
-- Description: Create RLS policies for public read access

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public read access" ON public.creations;
DROP POLICY IF EXISTS "Public read access" ON public.categories;
DROP POLICY IF EXISTS "Public read access" ON public.media_assets;

-- Create public read access policies
CREATE POLICY "Public read access" ON public.creations
FOR SELECT TO anon
USING (true);

CREATE POLICY "Public read access" ON public.categories
FOR SELECT TO anon
USING (true);

CREATE POLICY "Public read access" ON public.media_assets
FOR SELECT TO anon
USING (true);