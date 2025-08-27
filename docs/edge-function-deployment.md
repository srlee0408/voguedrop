# Supabase Edge Function 배포 가이드

## 개요
이 문서는 영상 업로드 크기 제한 문제를 해결하기 위해 Supabase Edge Function을 배포하는 방법을 설명합니다.

### 문제 해결
- **기존 문제**: Vercel의 4.5MB 요청 본문 크기 제한
- **해결책**: Supabase Edge Function 사용 (50MB까지 지원)

## 필수 사항

### 1. Supabase CLI 설치

⚠️ **중요**: npm global 설치는 지원되지 않습니다!
```bash
# ❌ 이렇게 하지 마세요
npm install -g supabase  # 에러 발생: "Installing Supabase CLI as a global module is not supported"
```

#### NPX 사용 (권장 - 설치 없이 실행)
```bash
# 설치 없이 직접 실행
npx supabase@latest --version

# 모든 명령어에 npx supabase@latest 사용
npx supabase@latest functions deploy upload-video --project-ref YOUR_PROJECT_REF
```

#### macOS (Homebrew 사용)
```bash
# Homebrew로 설치
brew install supabase/tap/supabase

# 설치 확인
supabase --version

# 주의: Command Line Tools 업데이트 필요 시
# Error: Your Command Line Tools (CLT) does not support macOS 15 발생 시
sudo rm -rf /Library/Developer/CommandLineTools
sudo xcode-select --install
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

### 2. Supabase 액세스 토큰 생성 및 설정

터미널 환경에서는 브라우저 자동 로그인이 안 되므로 액세스 토큰이 필요합니다.

#### 토큰 생성
1. https://app.supabase.com/account/tokens 접속
2. "Generate new token" 클릭
3. 토큰 이름 입력 (예: "VogueDrop CLI")
4. 생성된 토큰 복사 (⚠️ 한 번만 표시됨!)

#### 토큰 설정
```bash
# 환경 변수로 설정 (권장)
export SUPABASE_ACCESS_TOKEN="your-token-here"

# 또는 .env.local에 추가
echo "SUPABASE_ACCESS_TOKEN=your-token-here" >> .env.local
```

### 3. 프로젝트 연결
```bash
# 프로젝트 루트 디렉토리에서 실행
cd "/Users/srlee/Desktop/커서개발/3. 서비스/voguedrop"  # 경로에 공백이 있으면 따옴표 필수!

# NPX로 실행 시
npx supabase@latest link --project-ref YOUR_PROJECT_REF
```

## Edge Function 배포

### 1. 함수 배포 (NPX 사용)
```bash
# 환경 변수 설정 필수!
export SUPABASE_ACCESS_TOKEN="your-token-here"

# upload-video 함수 배포
npx supabase@latest functions deploy upload-video --project-ref YOUR_PROJECT_REF

# 배포 확인
npx supabase@latest functions list --project-ref YOUR_PROJECT_REF

# 실제 사용 예시
cd "/Users/srlee/Desktop/커서개발/3. 서비스/voguedrop"
export SUPABASE_ACCESS_TOKEN=""
npx supabase@latest functions deploy upload-video --project-ref snqyygrpybwhihektxxy
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

## 트러블슈팅 (실제 발생한 문제들)

### 문제 1: npm global 설치 실패
```bash
npm install -g supabase
# 에러: Installing Supabase CLI as a global module is not supported
```

**해결책**: NPX 사용 또는 Homebrew/Scoop으로 설치
```bash
npx supabase@latest --version  # NPX 사용 (권장)
# 또는
brew install supabase/tap/supabase  # macOS
```

### 문제 2: "로그인이 필요합니다" 에러
Edge Function이 작동하지만 인증이 실패하는 경우

**원인**: Edge Function에서 잘못된 방식으로 Supabase 클라이언트 생성
```typescript
// ❌ 잘못된 코드
const token = authHeader.replace('Bearer ', '');
const supabaseAuth = createClient(supabaseUrl, token);  // JWT를 키로 사용
```

**해결책**: anon key 사용 + Authorization 헤더
```typescript
// 올바른 코드
const supabaseAnon = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const supabaseAuth = createClient(supabaseUrl, supabaseAnon, {
  global: {
    headers: {
      Authorization: `Bearer ${token}`,  // JWT는 헤더로 전달
    },
  },
});
```

### 문제 3: 504 Gateway Timeout
대용량 파일 업로드 시 타임아웃 발생

**원인**: 
- Edge Function이 전체 파일을 메모리에 로드
- FormData 파싱 → ArrayBuffer 변환 → Storage 업로드 (3단계)
- 네트워크 속도가 느린 경우 60초 제한 초과

**해결책**:
1. 작은 파일(5-10MB)부터 테스트
2. 클라이언트 타임아웃 연장
```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 120000); // 2분
```
3. 장기적으로는 Presigned URL 방식 고려

### 문제 4: 터미널에서 로그인 실패
```bash
npx supabase@latest login
# 에러: Cannot use automatic login flow inside non-TTY environments
```

**해결책**: 액세스 토큰 사용
1. https://app.supabase.com/account/tokens 에서 토큰 생성
2. 환경 변수 설정: `export SUPABASE_ACCESS_TOKEN="your-token"`

### 문제 5: CORS 에러
- `supabase/functions/_shared/cors.ts` 파일 확인
- OPTIONS 요청 처리 확인
```typescript
if (req.method === 'OPTIONS') {
  return new Response('ok', { headers: corsHeaders });
}
```

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