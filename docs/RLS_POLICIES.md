# Supabase RLS (Row Level Security) Policies

이 문서는 VogueDrop 프로젝트의 Supabase RLS 정책 설정을 설명합니다.

## 현재 데이터베이스 스키마

VogueDrop은 다음 테이블을 사용합니다:
- `categories` - 효과 카테고리 (effect, camera, model)
- `effect_templates` - AI 효과 템플릿
- `media_assets` - 미디어 파일 참조
- `video_generations` - AI 영상 생성 기록

## MVP 단계 (인증 없음)

MVP에서는 RLS를 비활성화하거나 모든 읽기를 public으로 설정합니다:

```sql
-- RLS 비활성화 (개발 편의를 위해)
ALTER TABLE public.categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.effect_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_assets DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_generations DISABLE ROW LEVEL SECURITY;
```

또는 RLS를 활성화하되 모든 읽기를 허용:

```sql
-- Enable RLS on all tables
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.effect_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_generations ENABLE ROW LEVEL SECURITY;

-- Public read access for all tables
CREATE POLICY "Public read access" ON public.categories
FOR SELECT TO anon, authenticated
USING (true);

CREATE POLICY "Public read access" ON public.effect_templates
FOR SELECT TO anon, authenticated
USING (true);

CREATE POLICY "Public read access" ON public.media_assets
FOR SELECT TO anon, authenticated
USING (true);

CREATE POLICY "Public read access" ON public.video_generations
FOR SELECT TO anon, authenticated
USING (true);

-- Allow anonymous users to create video generations
CREATE POLICY "Anyone can create generations" ON public.video_generations
FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- Allow anonymous users to update their generations
CREATE POLICY "Anyone can update generations" ON public.video_generations
FOR UPDATE TO anon, authenticated
USING (true);
```

## 인증 구현 후 RLS 정책

인증 기능을 추가한 후에는 다음과 같은 정책을 적용합니다:

### 1. categories 테이블
```sql
-- 모든 사용자가 카테고리를 읽을 수 있음
CREATE POLICY "Public read access" ON public.categories
FOR SELECT TO anon, authenticated
USING (true);

-- 관리자만 카테고리를 수정할 수 있음 (추후 구현)
```

### 2. effect_templates 테이블
```sql
-- 모든 사용자가 효과 템플릿을 읽을 수 있음
CREATE POLICY "Public read access" ON public.effect_templates
FOR SELECT TO anon, authenticated
USING (true);

-- 관리자만 효과를 추가/수정할 수 있음 (추후 구현)
```

### 3. media_assets 테이블
```sql
-- 모든 사용자가 미디어 에셋을 읽을 수 있음
CREATE POLICY "Public read access" ON public.media_assets
FOR SELECT TO anon, authenticated
USING (true);

-- 인증된 사용자만 미디어를 업로드할 수 있음
CREATE POLICY "Authenticated users can upload" ON public.media_assets
FOR INSERT TO authenticated
WITH CHECK (true);
```

### 4. video_generations 테이블
```sql
-- 사용자는 자신의 영상 생성 기록만 볼 수 있음
CREATE POLICY "Users can view own generations" ON public.video_generations
FOR SELECT TO authenticated
USING (auth.uid()::text = user_id);

-- 익명 사용자는 세션 기반으로 자신의 기록만 볼 수 있음
CREATE POLICY "Anonymous can view session generations" ON public.video_generations
FOR SELECT TO anon
USING (user_id = 'anonymous' AND created_at > NOW() - INTERVAL '24 hours');

-- 인증된 사용자는 자신의 영상을 생성할 수 있음
CREATE POLICY "Users can create own generations" ON public.video_generations
FOR INSERT TO authenticated
WITH CHECK (auth.uid()::text = user_id);

-- 익명 사용자도 영상을 생성할 수 있음 (user_id = 'anonymous')
CREATE POLICY "Anonymous can create generations" ON public.video_generations
FOR INSERT TO anon
WITH CHECK (user_id = 'anonymous');

-- 사용자는 자신의 영상 생성 상태를 업데이트할 수 있음
CREATE POLICY "Users can update own generations" ON public.video_generations
FOR UPDATE TO authenticated
USING (auth.uid()::text = user_id);

-- 사용자는 자신의 영상 기록을 삭제할 수 있음
CREATE POLICY "Users can delete own generations" ON public.video_generations
FOR DELETE TO authenticated
USING (auth.uid()::text = user_id);
```

## 모든 정책을 한 번에 실행 (인증 구현 후)

```sql
-- Enable RLS on all tables
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.effect_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_generations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public read access" ON public.categories;
DROP POLICY IF EXISTS "Public read access" ON public.effect_templates;
DROP POLICY IF EXISTS "Public read access" ON public.media_assets;
DROP POLICY IF EXISTS "Users can view own generations" ON public.video_generations;
DROP POLICY IF EXISTS "Anonymous can view session generations" ON public.video_generations;
DROP POLICY IF EXISTS "Users can create own generations" ON public.video_generations;
DROP POLICY IF EXISTS "Anonymous can create generations" ON public.video_generations;
DROP POLICY IF EXISTS "Users can update own generations" ON public.video_generations;
DROP POLICY IF EXISTS "Users can delete own generations" ON public.video_generations;

-- Create policies for categories
CREATE POLICY "Public read access" ON public.categories
FOR SELECT TO anon, authenticated
USING (true);

-- Create policies for effect_templates
CREATE POLICY "Public read access" ON public.effect_templates
FOR SELECT TO anon, authenticated
USING (true);

-- Create policies for media_assets
CREATE POLICY "Public read access" ON public.media_assets
FOR SELECT TO anon, authenticated
USING (true);

CREATE POLICY "Authenticated users can upload" ON public.media_assets
FOR INSERT TO authenticated
WITH CHECK (true);

-- Create policies for video_generations
CREATE POLICY "Users can view own generations" ON public.video_generations
FOR SELECT TO authenticated
USING (auth.uid()::text = user_id);

CREATE POLICY "Anonymous can view session generations" ON public.video_generations
FOR SELECT TO anon
USING (user_id = 'anonymous' AND created_at > NOW() - INTERVAL '24 hours');

CREATE POLICY "Users can create own generations" ON public.video_generations
FOR INSERT TO authenticated
WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Anonymous can create generations" ON public.video_generations
FOR INSERT TO anon
WITH CHECK (user_id = 'anonymous');

CREATE POLICY "Users can update own generations" ON public.video_generations
FOR UPDATE TO authenticated
USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own generations" ON public.video_generations
FOR DELETE TO authenticated
USING (auth.uid()::text = user_id);
```

## 정책 확인

현재 적용된 정책을 확인하려면:

```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public';
```

## Storage 버킷 RLS 정책

미디어 파일 업로드를 위한 Storage 정책:

```sql
-- Public read access to media-asset bucket
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'media-asset');

-- Authenticated users can upload to media-asset bucket
CREATE POLICY "Authenticated users can upload" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'media-asset');

-- Users can update their own uploads
CREATE POLICY "Users can update own files" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'media-asset' AND auth.uid()::text = owner);

-- Users can delete their own uploads
CREATE POLICY "Users can delete own files" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'media-asset' AND auth.uid()::text = owner);
```

## 문제 해결

1. **데이터가 표시되지 않는 경우**
   - RLS가 활성화되어 있는지 확인
   - 적절한 정책이 생성되어 있는지 확인
   - anon role에 SELECT 권한이 있는지 확인

2. **정책이 적용되지 않는 경우**
   - 기존 정책을 DROP하고 다시 생성
   - Supabase 대시보드에서 정책 상태 확인

3. **권한 오류가 발생하는 경우**
   - Supabase anon key가 올바르게 설정되어 있는지 확인
   - 테이블에 대한 기본 권한 확인

4. **MVP 개발 시 권장사항**
   - 개발 초기에는 RLS를 비활성화하여 빠른 개발
   - 인증 기능 구현 시점에 RLS 정책 적용
   - 프로덕션 배포 전 반드시 RLS 정책 검토

## 참고사항

- `user_id = 'anonymous'`는 비로그인 사용자를 위한 임시 처리
- 익명 사용자의 데이터는 24시간 후 자동으로 접근 불가 (정리는 별도 처리 필요)
- 인증 구현 후에는 반드시 RLS 정책을 재검토하고 보안을 강화해야 함