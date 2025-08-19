# User Upload 기능 데이터베이스 설정 가이드

## 개요
사용자 업로드 기능은 기존 videos 버킷을 재사용하며, RLS 대신 API Route에서 Service Client를 통해 보안을 처리합니다. 이는 프로젝트 전체의 MVP 패턴을 따릅니다.

## 1. 데이터베이스 테이블 생성

Supabase Dashboard에서 다음 단계를 수행하세요:

1. **SQL Editor** 탭으로 이동
2. 아래 SQL을 실행하여 `user_uploaded_videos` 테이블 생성:

```sql
-- Create user_uploaded_videos table
CREATE TABLE IF NOT EXISTS public.user_uploaded_videos (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    duration FLOAT,
    aspect_ratio TEXT,
    thumbnail_url TEXT,
    metadata JSONB DEFAULT '{}',
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_user_uploaded_videos_user_id ON public.user_uploaded_videos(user_id);
CREATE INDEX idx_user_uploaded_videos_uploaded_at ON public.user_uploaded_videos(uploaded_at DESC);
CREATE INDEX idx_user_uploaded_videos_is_deleted ON public.user_uploaded_videos(is_deleted);

-- DISABLE RLS for MVP (security handled at API level)
ALTER TABLE public.user_uploaded_videos DISABLE ROW LEVEL SECURITY;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.user_uploaded_videos
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Grant permissions
GRANT ALL ON public.user_uploaded_videos TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.user_uploaded_videos_id_seq TO authenticated;
```

## 2. Storage 버킷 설정

### 2.1 기존 videos 버킷 확인

1. **Storage** 탭으로 이동
2. `videos` 버킷이 이미 존재하는지 확인
3. 버킷이 Public으로 설정되어 있는지 확인

### 2.2 Storage 정책 (MVP에서는 비활성화)

MVP에서는 Storage RLS 정책을 추가하지 않습니다. 모든 파일 작업은 API Route에서 Service Client를 통해 처리됩니다.

**폴더 구조**:
```
videos/
├── ai-generations/     (기존 AI 생성 비디오)
│   └── {job_id}/
│       └── output.mp4
└── user-uploads/       (사용자 업로드 비디오)
    └── {user_id}/
        └── {timestamp}_{filename}.mp4
```

**보안 처리**:
- 업로드: `/api/upload/video` API Route에서 인증 확인 후 Service Client로 처리
- 조회: `/api/canvas/library` API Route에서 user_id 필터링
- 삭제: API Route에서 소유권 확인 후 처리

## 3. 환경 변수 확인

`.env.local` 파일에 다음 변수들이 설정되어 있는지 확인:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
```

## 4. 테스트

1. 애플리케이션을 실행: `npm run dev`
2. Video Editor 페이지로 이동
3. Video Library 모달 열기
4. Uploads 카테고리 선택
5. "Upload Video" 버튼 클릭
6. 20MB 이하의 비디오 파일 선택
7. 업로드 진행률 확인
8. 업로드 완료 후 라이브러리에 표시되는지 확인

## 5. 문제 해결

### 업로드 실패 시
- Supabase Dashboard에서 Storage 버킷이 생성되었는지 확인
- RLS 정책이 올바르게 설정되었는지 확인
- 환경 변수가 올바른지 확인
- 파일 크기가 20MB를 초과하지 않는지 확인

### 데이터베이스 오류 시
- `user_uploaded_videos` 테이블이 생성되었는지 확인
- RLS가 활성화되어 있는지 확인
- 사용자가 로그인되어 있는지 확인

## 6. 유지보수

### 오래된 업로드 정리 (선택사항)
```sql
-- 30일 이상된 삭제 표시된 파일 영구 삭제
DELETE FROM public.user_uploaded_videos 
WHERE is_deleted = true 
AND updated_at < NOW() - INTERVAL '30 days';
```

### 사용량 모니터링
```sql
-- 사용자별 업로드 용량 확인
SELECT 
    user_id,
    COUNT(*) as file_count,
    SUM(file_size) / (1024 * 1024) as total_mb
FROM public.user_uploaded_videos
WHERE is_deleted = false
GROUP BY user_id
ORDER BY total_mb DESC;
```