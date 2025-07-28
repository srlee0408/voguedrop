-- Migration 001: Initial Schema Setup
-- Created: 2025-07-28
-- Description: Create initial database tables for VogueDrop

-- Categories table
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Media assets table
CREATE TABLE IF NOT EXISTS public.media_assets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    storage_path TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    media_type VARCHAR(50) NOT NULL,
    file_size INTEGER,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Creations table
CREATE TABLE IF NOT EXISTS public.creations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    prompt TEXT,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    product_id UUID REFERENCES public.media_assets(id) ON DELETE CASCADE,
    user_id UUID,
    is_featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Creation media links table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS public.creation_media_links (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    creation_id UUID NOT NULL REFERENCES public.creations(id) ON DELETE CASCADE,
    media_id UUID NOT NULL REFERENCES public.media_assets(id) ON DELETE CASCADE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(creation_id, media_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_creations_category_id ON public.creations(category_id);
CREATE INDEX IF NOT EXISTS idx_creations_user_id ON public.creations(user_id);
CREATE INDEX IF NOT EXISTS idx_creations_created_at ON public.creations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_creation_media_links_creation_id ON public.creation_media_links(creation_id);
CREATE INDEX IF NOT EXISTS idx_creation_media_links_media_id ON public.creation_media_links(media_id);

-- Add updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_media_assets_updated_at BEFORE UPDATE ON public.media_assets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_creations_updated_at BEFORE UPDATE ON public.creations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();