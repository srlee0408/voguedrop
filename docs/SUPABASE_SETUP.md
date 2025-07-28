# Supabase Setup Guide

## Storage Bucket Configuration

For the gallery images to work properly, you need to set up the following storage buckets in Supabase:

### 1. Create Storage Buckets

Go to your Supabase project dashboard > Storage and create the following buckets:

1. **media-asset** bucket
   - Public access: Yes (enable public access)
   - Allowed MIME types: image/*, video/*

### 2. Bucket Policies

Make sure the buckets have the correct RLS (Row Level Security) policies:

```sql
-- Allow public read access to media-asset bucket
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'media-asset');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'media-asset');
```

### 3. Storage Path Format

When storing image paths in the `media_assets` table, use this format:
- Path within bucket: `camera/filename.png` or `subfolder/filename.png`
- The code will automatically prepend the bucket name `media-asset/`

### 4. Testing Storage Access

You can test if a storage URL is accessible by visiting:
```
https://[your-project-ref].supabase.co/storage/v1/object/public/media-asset/camera/[filename]
```

Example:
```
https://snqyygrpybwhihektxxy.supabase.co/storage/v1/object/public/media-asset/camera/a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d.png
```

## Database Setup

Make sure your database tables are created with the correct foreign key relationships as shown in the schema.