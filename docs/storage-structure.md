# Storage 구조 가이드

## 개요
VogueDrop의 모든 사용자 업로드 파일은 `user-upload` 버킷에 카테고리별로 체계적으로 저장됩니다.

## Storage 버킷 구조

### 단일 버킷: `user-upload`
모든 사용자 업로드 파일은 하나의 버킷에서 관리됩니다.

```
user-upload/
├── image/                    # 이미지 파일
│   └── {user_id}/
│       └── {timestamp}-{random}.{ext}
│
├── video/                    # 비디오 파일
│   └── {user_id}/
│       ├── {timestamp}_{filename}.mp4
│       └── thumbnails/       # 비디오 썸네일
│           └── {timestamp}_thumbnail.jpg
│
└── music/                    # 음악/오디오 파일
    └── {user_id}/
        └── {timestamp}_{filename}.{ext}
```

## 파일 업로드 API

### 1. 이미지 업로드
- **엔드포인트**: `lib/supabase/storage.ts`의 `uploadImage()` 함수
- **경로 형식**: `image/{user_id}/{timestamp}-{random}.{ext}`
- **지원 형식**: JPG, PNG, GIF, WebP
- **최대 크기**: 5MB

### 2. 비디오 업로드
- **엔드포인트**: `/api/upload/video`
- **경로 형식**: `video/{user_id}/{timestamp}_{filename}.mp4`
- **썸네일**: `video/{user_id}/thumbnails/{timestamp}_thumbnail.jpg`
- **지원 형식**: MP4, WebM, MOV, AVI
- **최대 크기**: 20MB
- **DB 테이블**: `user_uploaded_videos`

### 3. 음악 업로드
- **엔드포인트**: `/api/upload/music`
- **경로 형식**: `music/{user_id}/{timestamp}_{filename}.{ext}`
- **지원 형식**: MP3, WAV, M4A, OGG, WebM, FLAC
- **최대 크기**: 10MB
- **DB 테이블**: `user_uploaded_music`

## 보안 처리

### API Router 기반 보안
- 모든 업로드/삭제 작업은 API Route를 통해 처리
- Service Client를 사용하여 RLS 정책 우회
- 각 요청에서 사용자 인증 상태 확인

```typescript
// 인증 확인 예시
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
if (!user) {
  return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
}
```

### 파일 검증
- 파일 크기 제한 체크
- MIME 타입 검증
- 파일명 sanitization (특수문자 제거)

## 데이터베이스 구조

### user_uploaded_videos 테이블
```sql
- id: BIGSERIAL PRIMARY KEY
- user_id: UUID (auth.users 참조)
- file_name: TEXT
- storage_path: TEXT
- file_size: BIGINT
- duration: FLOAT
- aspect_ratio: TEXT
- thumbnail_url: TEXT
- metadata: JSONB
- is_deleted: BOOLEAN
- uploaded_at: TIMESTAMP
```

### user_uploaded_music 테이블
```sql
- id: BIGSERIAL PRIMARY KEY
- user_id: UUID (auth.users 참조)
- file_name: TEXT
- storage_path: TEXT
- file_size: BIGINT
- duration: FLOAT
- metadata: JSONB
- is_deleted: BOOLEAN
- uploaded_at: TIMESTAMP
```

## 파일 접근

### 공개 URL 생성
```typescript
const { data: { publicUrl } } = supabase.storage
  .from('user-upload')
  .getPublicUrl(storagePath);
```

### 파일 삭제 (Soft Delete)
- DB에서 `is_deleted` 플래그를 true로 설정
- 실제 Storage 파일은 유지 (필요시 별도 배치 작업으로 정리)

## 마이그레이션 노트

### 기존 파일 호환성
- 기존 `user-uploads` 버킷의 파일들은 그대로 유지
- 기존 `videos` 버킷의 파일들은 그대로 유지
- 새로운 업로드만 새 구조 적용

### 점진적 마이그레이션
필요시 다음 스크립트로 기존 파일 마이그레이션 가능:
```sql
-- 예시: 기존 경로를 새 경로로 업데이트
UPDATE user_uploaded_videos 
SET storage_path = REPLACE(storage_path, 'user-uploads/', 'video/')
WHERE storage_path LIKE 'user-uploads/%';
```

## 모니터링 및 유지보수

### 사용량 확인
```sql
-- 사용자별 총 업로드 용량
SELECT 
  user_id,
  SUM(CASE WHEN table_name = 'video' THEN file_size ELSE 0 END) / (1024*1024) as video_mb,
  SUM(CASE WHEN table_name = 'music' THEN file_size ELSE 0 END) / (1024*1024) as music_mb,
  SUM(file_size) / (1024*1024) as total_mb
FROM (
  SELECT user_id, file_size, 'video' as table_name FROM user_uploaded_videos WHERE is_deleted = false
  UNION ALL
  SELECT user_id, file_size, 'music' as table_name FROM user_uploaded_music WHERE is_deleted = false
) combined
GROUP BY user_id
ORDER BY total_mb DESC;
```

### 정리 작업
```sql
-- 30일 이상된 삭제 표시 파일 영구 삭제
DELETE FROM user_uploaded_videos 
WHERE is_deleted = true AND updated_at < NOW() - INTERVAL '30 days';

DELETE FROM user_uploaded_music 
WHERE is_deleted = true AND updated_at < NOW() - INTERVAL '30 days';
```