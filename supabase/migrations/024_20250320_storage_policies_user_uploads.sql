-- Storage configuration for videos bucket - MVP approach
-- Note: The videos bucket already exists and is used for AI-generated videos
-- For MVP, we're not adding specific RLS policies for user uploads
-- All security is handled at the API Route level using Service Client
-- This follows the same pattern as the rest of the application

-- The videos bucket structure:
-- videos/
--   ├── ai-generations/     (existing AI-generated videos)
--   │   └── {job_id}/
--   │       └── output.mp4
--   └── user-uploads/       (new user uploaded videos)
--       └── {user_id}/
--           └── {timestamp}_{filename}.mp4

-- No additional storage policies needed for MVP
-- The existing public read policy for the videos bucket is sufficient
-- All upload/update/delete operations are handled through API routes with Service Client

-- If you need to add RLS policies in the future, use these templates:
-- INSERT policy: ((storage.foldername(name))[1] = 'user-uploads') AND ((storage.foldername(name))[2] = auth.uid()::text)
-- UPDATE policy: ((storage.foldername(name))[1] = 'user-uploads') AND ((storage.foldername(name))[2] = auth.uid()::text)
-- DELETE policy: ((storage.foldername(name))[1] = 'user-uploads') AND ((storage.foldername(name))[2] = auth.uid()::text)