-- Create storage bucket for user uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-uploads', 'user-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public access to the bucket
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT USING (bucket_id = 'user-uploads');

-- Allow authenticated users to upload
CREATE POLICY "Allow uploads" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'user-uploads');

-- Allow authenticated users to update their own files
CREATE POLICY "Allow updates" ON storage.objects
FOR UPDATE USING (bucket_id = 'user-uploads');

-- Allow authenticated users to delete their own files
CREATE POLICY "Allow deletes" ON storage.objects
FOR DELETE USING (bucket_id = 'user-uploads');