# Supabase Edge Function 배포 가이드

## 개요
이 문서는 영상 업로드 크기 제한 문제를 해결하기 위해 Supabase Edge Function을 배포하는 방법을 설명합니다.

### 문제 해결
- **기존 문제**: Vercel의 4.5MB 요청 본문 크기 제한
- **해결책**: Supabase Edge Function 사용 (50MB까지 지원)

## 필수 사항

### 1. Supabase CLI 설치

#### macOS (Homebrew 사용)
```bash
# Homebrew로 설치 (권장)
brew install supabase/tap/supabase

# 설치 확인
supabase --version
```

#### Windows (Scoop 사용)
```bash
# Scoop 설치 후
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

#### Linux
```bash
# wget 사용
wget -qO- https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz | tar xvz
sudo mv supabase /usr/local/bin/

# 또는 curl 사용
curl -L https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz | tar xvz
sudo mv supabase /usr/local/bin/
```

#### NPX (설치 없이 실행)
```bash
# 설치 없이 직접 실행
npx supabase@latest --version
```

### 2. Supabase 프로젝트 연결
```bash
# 프로젝트 루트 디렉토리에서 실행
cd /Users/srlee/Desktop/커서개발/3. 서비스/voguedrop

# Supabase 로그인
supabase login

# 프로젝트 연결 (프로젝트 ID 사용)
supabase link --project-ref snqyygrpybwhihektxxy
```

## Edge Function 배포

### 1. 함수 배포
```bash
# upload-video 함수 배포
supabase functions deploy upload-video --project-ref snqyygrpybwhihektxxy

# 배포 확인
supabase functions list --project-ref snqyygrpybwhihektxxy
```

### 2. 환경 변수 설정 (선택사항)
Edge Function은 자동으로 다음 환경 변수에 접근 가능합니다:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

추가 환경 변수가 필요한 경우:
```bash
supabase secrets set KEY=VALUE --project-ref snqyygrpybwhihektxxy
```

## 로컬 테스트

### 1. 로컬 Edge Function 실행
```bash
# Edge Functions 서버 시작
supabase functions serve

# 특정 함수만 실행
supabase functions serve upload-video --env-file .env.local
```

### 2. 테스트 요청
```bash
# 로컬 테스트 (파일 업로드)
curl -X POST http://localhost:54321/functions/v1/upload-video \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "file=@test-video.mp4"
```

## 프로덕션 사용

### 1. 클라이언트 설정
`.env.local` 파일에 다음 환경 변수가 설정되어 있는지 확인:
```env
NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL=https://snqyygrpybwhihektxxy.supabase.co/functions/v1
```

### 2. 업로드 함수 호출
클라이언트 코드는 이미 수정되어 자동으로 Edge Function을 사용합니다:
- `lib/api/upload.ts`: 업로드 유틸리티 함수
- `components/modals/library/components/LibraryUpload.tsx`: UI 컴포넌트

### 3. CORS 설정
Edge Function은 자동으로 CORS 헤더를 처리합니다:
- `supabase/functions/_shared/cors.ts`: CORS 설정 파일

## 모니터링 및 디버깅

### 1. 함수 로그 확인
```bash
# 실시간 로그 스트리밍
supabase functions logs upload-video --project-ref snqyygrpybwhihektxxy

# 최근 로그 확인
supabase functions logs upload-video --project-ref snqyygrpybwhihektxxy --tail 100
```

### 2. 함수 상태 확인
Supabase 대시보드에서 확인:
1. https://app.supabase.com/project/snqyygrpybwhihektxxy
2. Edge Functions 섹션으로 이동
3. `upload-video` 함수 상태 확인

## 트러블슈팅

### 문제: 함수가 배포되지 않음
```bash
# Supabase CLI 업데이트
npm update -g supabase

# 함수 디렉토리 확인
ls -la supabase/functions/upload-video/
```

### 문제: CORS 에러
- `supabase/functions/_shared/cors.ts` 파일 확인
- 클라이언트 origin이 허용되었는지 확인

### 문제: 인증 실패
- 클라이언트에서 올바른 access token을 전송하는지 확인
- Supabase Auth 세션이 유효한지 확인

### 문제: 파일 크기 제한
- Edge Function은 최대 50MB까지 지원
- 클라이언트 측에서도 파일 크기 검증 확인

## 롤백

기존 Vercel API로 롤백이 필요한 경우:
1. `lib/api/upload.ts`에서 `uploadVideoToVercelAPI` 함수 사용
2. 파일 크기 제한을 4MB로 조정

## 성능 최적화

1. **청크 업로드**: 대용량 파일의 경우 청크 단위 업로드 고려
2. **압축**: 클라이언트 측 비디오 압축 구현
3. **CDN**: Supabase Storage CDN 활용

## 보안 고려사항

1. **인증**: 모든 요청에 유효한 JWT 토큰 필요
2. **파일 검증**: 서버 측에서 파일 타입 및 크기 검증
3. **Rate Limiting**: Supabase 대시보드에서 rate limit 설정

## 참고 자료

- [Supabase Edge Functions 문서](https://supabase.com/docs/guides/functions)
- [Supabase CLI 문서](https://supabase.com/docs/guides/cli)
- [Deno 런타임 문서](https://deno.land/manual)