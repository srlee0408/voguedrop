# Storage Bucket 설정 가이드

## 1. Supabase Dashboard에서 버킷 생성

### Step 1: Storage 탭으로 이동
1. Supabase 프로젝트 대시보드 접속
2. 왼쪽 메뉴에서 **Storage** 클릭

### Step 2: 새 버킷 생성
1. **New bucket** 버튼 클릭
2. 다음 정보 입력:
   - **Name**: `media-asset`
   - **Public bucket**: ON (반드시 체크)
   - **Allowed MIME types**: `image/*,video/*` (선택사항)
   - **File size limit**: 50MB (또는 원하는 크기)

### Step 3: 버킷 생성 확인
- 생성된 `media-asset` 버킷이 목록에 표시되는지 확인
- Public 아이콘이 표시되는지 확인

## 2. SQL Editor에서 정책 설정

### Step 1: SQL Editor 열기
1. 왼쪽 메뉴에서 **SQL Editor** 클릭
2. **New query** 클릭

### Step 2: Storage 정책 SQL 실행
`migrations/004_storage_buckets.sql` 파일의 내용을 복사하여 실행:

```sql
-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Public read access for media-asset bucket
CREATE POLICY "Public read access for media-asset" ON storage.objects
FOR SELECT 
USING (bucket_id = 'media-asset');

-- 나머지 정책들...
```

## 3. 정책 확인

### SQL로 확인
```sql
-- Storage 정책 확인
SELECT * FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects'
AND policyname LIKE '%media-asset%';
```

### Dashboard에서 확인
1. **Storage** > `media-asset` 버킷 클릭
2. **Policies** 탭에서 생성된 정책들 확인

## 4. 테스트

### 이미지 업로드 테스트
1. Storage > `media-asset` 버킷 클릭
2. **Upload files** 버튼으로 테스트 이미지 업로드
3. 업로드된 파일 클릭하여 공개 URL 확인

### 공개 접근 테스트
```
https://[your-project-ref].supabase.co/storage/v1/object/public/media-asset/[file-path]
```

브라우저에서 위 URL로 접속하여 이미지가 표시되는지 확인

## 문제 해결

### "Permission denied" 오류
- 버킷이 Public으로 설정되어 있는지 확인
- RLS 정책이 올바르게 생성되었는지 확인

### 이미지가 표시되지 않음
- 파일 경로가 올바른지 확인
- `media-asset/` 접두사가 포함되어 있는지 확인
- 브라우저 개발자 도구에서 네트워크 오류 확인