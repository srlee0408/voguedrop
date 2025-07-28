-- Migration 002: Enable Row Level Security
-- Created: 2025-07-28
-- Description: Enable RLS on all tables

-- Enable RLS on all tables
ALTER TABLE public.creations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creation_media_links ENABLE ROW LEVEL SECURITY;