# Canvas AI Database Migrations

## Overview
This directory contains database migrations for the Canvas AI video generation feature.

## Important Note
The table `video_generations` already exists in the database. Only `effect_templates` table needs to be created.

## Migration Files

1. **20250130_add_canvas_ai_tables.sql**
   - Creates `effect_templates` table for storing AI effect options
   - Creates indexes for performance
   - Sets up RLS policies

2. **20250130_add_canvas_categories.sql**
   - Adds Canvas-specific categories: 'effect', 'camera', 'model'

## Seed Data

- **seeds/canvas-effect-templates.sql**
  - Populates effect templates with 6 options per category
  - Total of 18 effect templates for MVP

## Running Migrations

```bash
# Apply migrations
supabase db push

# Or manually run in order:
psql $DATABASE_URL -f supabase/migrations/20250130_add_canvas_ai_tables.sql
psql $DATABASE_URL -f supabase/migrations/20250130_add_canvas_categories.sql
psql $DATABASE_URL -f supabase/seeds/canvas-effect-templates.sql
```

## Testing

Run `test-migrations.sql` to verify:
```bash
psql $DATABASE_URL -f supabase/test-migrations.sql
```

## Rollback

If needed, use the rollback script:
```sql
-- Drop tables in reverse order
DROP TABLE IF EXISTS public.video_generations CASCADE;
DROP TABLE IF EXISTS public.effect_templates CASCADE;

-- Remove categories
DELETE FROM public.categories WHERE name IN ('effect', 'camera', 'model');
```