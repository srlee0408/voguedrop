# Database Migrations

이 디렉토리는 VogueDrop 프로젝트의 데이터베이스 마이그레이션 파일들을 포함합니다.

## 마이그레이션 순서

마이그레이션은 번호 순서대로 실행되어야 합니다:

1. **001_initial_schema.sql** - 초기 데이터베이스 스키마 생성
2. **002_enable_rls.sql** - Row Level Security 활성화
3. **003_public_read_policies.sql** - 공개 읽기 권한 정책 추가
4. **004_storage_buckets.sql** - 스토리지 버킷 정책 설정
5. **005_sample_data.sql** - 샘플 데이터 삽입

## 실행 방법

### Supabase Dashboard 사용

1. Supabase 프로젝트 대시보드로 이동
2. SQL Editor 탭 클릭
3. 각 마이그레이션 파일의 내용을 순서대로 복사하여 실행

### Supabase CLI 사용

```bash
# Supabase CLI가 설치되어 있고 프로젝트가 연결된 경우
supabase db reset
supabase migration up
```

## 주의사항

- **004_storage_buckets.sql**: 스토리지 버킷은 Supabase Dashboard에서 먼저 생성해야 합니다
  - Bucket name: `media-asset`
  - Public access: Yes
  
- **005_sample_data.sql**: 샘플 데이터를 삽입하기 전에 스토리지 버킷에 해당 이미지 파일들이 업로드되어 있어야 합니다

## 새 마이그레이션 추가

새로운 마이그레이션을 추가할 때는 다음 명명 규칙을 따르세요:

```
{번호}_{설명}.sql
```

예시:
- `006_add_user_profiles.sql`
- `007_add_favorites_table.sql`

번호는 항상 3자리로 패딩하여 정렬이 올바르게 되도록 합니다.