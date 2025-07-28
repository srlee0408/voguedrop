# Supabase RLS (Row Level Security) Policies

이 문서는 VogueDrop 프로젝트의 Supabase RLS 정책 설정을 설명합니다.

## RLS 활성화

먼저 각 테이블에 RLS를 활성화해야 합니다:

```sql
-- Enable RLS on all tables
ALTER TABLE public.creations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creation_media_links ENABLE ROW LEVEL SECURITY;
```

## Public Read Access 정책

갤러리 기능이 작동하려면 다음 정책들을 추가해야 합니다:

### 1. creations 테이블
```sql
-- Drop existing policy if exists
DROP POLICY IF EXISTS "Public read access" ON public.creations;

-- Create new policy
CREATE POLICY "Public read access" ON public.creations
FOR SELECT TO anon
USING (true);
```

### 2. categories 테이블
```sql
-- Drop existing policy if exists
DROP POLICY IF EXISTS "Public read access" ON public.categories;

-- Create new policy
CREATE POLICY "Public read access" ON public.categories
FOR SELECT TO anon
USING (true);
```

### 3. media_assets 테이블
```sql
-- Drop existing policy if exists
DROP POLICY IF EXISTS "Public read access" ON public.media_assets;

-- Create new policy
CREATE POLICY "Public read access" ON public.media_assets
FOR SELECT TO anon
USING (true);
```

### 4. creation_media_links 테이블
```sql
-- Drop existing policy if exists
DROP POLICY IF EXISTS "Public read access" ON public.creation_media_links;

-- Create new policy
CREATE POLICY "Public read access" ON public.creation_media_links
FOR SELECT TO anon
USING (true);
```

## 모든 정책을 한 번에 실행

다음 SQL을 복사하여 Supabase SQL Editor에서 실행하세요:

```sql
-- Enable RLS on all tables
ALTER TABLE public.creations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creation_media_links ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public read access" ON public.creations;
DROP POLICY IF EXISTS "Public read access" ON public.categories;
DROP POLICY IF EXISTS "Public read access" ON public.media_assets;
DROP POLICY IF EXISTS "Public read access" ON public.creation_media_links;

-- Create public read access policies
CREATE POLICY "Public read access" ON public.creations
FOR SELECT TO anon
USING (true);

CREATE POLICY "Public read access" ON public.categories
FOR SELECT TO anon
USING (true);

CREATE POLICY "Public read access" ON public.media_assets
FOR SELECT TO anon
USING (true);

CREATE POLICY "Public read access" ON public.creation_media_links
FOR SELECT TO anon
USING (true);
```

## 향후 인증 기능 추가 시

인증 기능을 추가할 때 다음과 같은 정책을 고려하세요:

### 인증된 사용자의 생성/수정/삭제 권한
```sql
-- Users can insert their own creations
CREATE POLICY "Users can insert own creations" ON public.creations
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their own creations
CREATE POLICY "Users can update own creations" ON public.creations
FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

-- Users can delete their own creations
CREATE POLICY "Users can delete own creations" ON public.creations
FOR DELETE TO authenticated
USING (auth.uid() = user_id);
```

## 정책 확인

현재 적용된 정책을 확인하려면:

```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public';
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