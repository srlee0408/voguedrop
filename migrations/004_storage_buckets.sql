-- Migration 004: Storage Bucket Setup
-- Created: 2025-07-28
-- Description: Storage bucket configuration guide

-- ⚠️ IMPORTANT: Storage 정책은 SQL로 직접 설정할 수 없습니다!
-- Supabase Dashboard에서 설정해야 합니다.

-- ============================================
-- STEP 1: Dashboard에서 버킷 생성
-- ============================================
-- 1. Supabase Dashboard > Storage 탭으로 이동
-- 2. "New bucket" 클릭
-- 3. 다음 설정으로 버킷 생성:
--    - Name: media-asset
--    - Public bucket: ✅ ON (반드시 체크!)
--    - Allowed MIME types: image/*,video/*
--    - File size limit: 50MB (또는 원하는 크기)

-- ============================================
-- STEP 2: Dashboard에서 정책 설정
-- ============================================
-- 1. Storage > media-asset 버킷 클릭
-- 2. "Policies" 탭 클릭
-- 3. "New Policy" 클릭하여 다음 정책들 추가:

-- Policy 1: Public Read Access (권장)
-- Dashboard에서 "Allow access to JPG images in a public folder to anonymous users" 템플릿 선택
-- 또는 직접 설정:
-- - Policy name: Public read access
-- - Allowed operation: SELECT
-- - Target roles: anon, authenticated
-- - Policy definition: true
-- - WITH CHECK expression: (비워둠)

-- Policy 2: Authenticated Upload
-- - Policy name: Authenticated users can upload
-- - Allowed operation: INSERT
-- - Target roles: authenticated
-- - Policy definition: true
-- - WITH CHECK expression: true

-- Policy 3: Authenticated Update (선택사항)
-- - Policy name: Users can update own files
-- - Allowed operation: UPDATE
-- - Target roles: authenticated
-- - Policy definition: (storage.foldername(name))[1] = auth.uid()::text
-- - WITH CHECK expression: (storage.foldername(name))[1] = auth.uid()::text

-- Policy 4: Authenticated Delete (선택사항)
-- - Policy name: Users can delete own files
-- - Allowed operation: DELETE
-- - Target roles: authenticated
-- - Policy definition: (storage.foldername(name))[1] = auth.uid()::text
-- - WITH CHECK expression: (비워둠)

-- ============================================
-- STEP 3: 정책 확인
-- ============================================
-- Storage > media-asset > Policies 탭에서 
-- 생성된 정책들이 표시되는지 확인

-- ============================================
-- 테스트 URL 형식
-- ============================================
-- https://[your-project-ref].supabase.co/storage/v1/object/public/media-asset/[file-path]
-- 
-- 예시:
-- https://snqyygrpybwhihektxxy.supabase.co/storage/v1/object/public/media-asset/camera/sample.jpg

-- ============================================
-- 주의사항
-- ============================================
-- 1. 버킷이 반드시 Public으로 설정되어야 함
-- 2. Dashboard에서 정책을 설정해야 함 (SQL로는 불가)
-- 3. 파일 업로드 후 공개 URL로 접근 가능한지 테스트