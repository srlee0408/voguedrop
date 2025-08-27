# Image Brush 배포 체크리스트

## 🚀 배포 준비 단계

### 1. 필수 API 키 발급
- [ ] BFL.ai API 토큰 발급 (https://bfl.ai)
- [ ] RunPod API 키 발급 (https://runpod.io)
- [ ] RunPod Serverless Endpoint 생성 (ComfyUI 템플릿)
- [ ] Supabase 프로젝트 준비

### 2. 로컬 환경 변수 설정 (.env.local)
```env
# Supabase 기본 설정
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key

# Supabase Functions URL
NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL=https://YOUR_PROJECT_REF.supabase.co/functions/v1

# API 키 (Edge Function용)
BFL_TOKEN=your-bfl-api-token
RUNPOD_API_KEY=your-runpod-api-key
RUNPOD_ENDPOINT_ID=your-runpod-endpoint-id
```

## 📦 배포 단계

### Step 1: 데이터베이스 마이그레이션
```bash
# Supabase 대시보드 SQL Editor에서 실행
# 1. 기본 테이블 생성
-- supabase/migrations/20240119_create_image_brush_history.sql 내용 실행

# 2. I2I 필드 추가
-- supabase/migrations/20240120_add_i2i_fields.sql 내용 실행

# 또는 CLI 사용
npx supabase@latest db push --project-ref YOUR_PROJECT_REF
```

### Step 2: Supabase Edge Function 배포
```bash
# 1. Supabase CLI 로그인
npx supabase@latest login

# 2. Edge Function 배포
cd /Users/srlee/Desktop/커서개발/3. 서비스/voguedrop
npx supabase@latest functions deploy image-brush \
  --project-ref YOUR_PROJECT_REF \
  --no-verify-jwt

# 3. 환경 변수 설정
npx supabase@latest secrets set BFL_TOKEN=your-bfl-token \
  --project-ref YOUR_PROJECT_REF

npx supabase@latest secrets set RUNPOD_API_KEY=your-key \
  --project-ref YOUR_PROJECT_REF

npx supabase@latest secrets set RUNPOD_ENDPOINT_ID=your-id \
  --project-ref YOUR_PROJECT_REF

# 4. 설정 확인
npx supabase@latest secrets list --project-ref YOUR_PROJECT_REF
npx supabase@latest functions list --project-ref YOUR_PROJECT_REF
```

### Step 3: Next.js API Routes 확인
- [x] `/app/api/canvas/image-brush/route.ts` - 메인 API
- [x] `/app/api/canvas/image-brush/history/route.ts` - 히스토리 API

### Step 4: Vercel 배포 설정
```bash
# 1. Vercel CLI 설치 (이미 설치된 경우 스킵)
npm i -g vercel

# 2. 환경 변수 설정
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL
vercel env add SUPABASE_SERVICE_KEY
vercel env add BFL_TOKEN
vercel env add RUNPOD_API_KEY
vercel env add RUNPOD_ENDPOINT_ID

# 3. 프로덕션 배포
vercel --prod
```

## 배포 후 테스트

### 1. FLUX 모드 테스트
```javascript
// 브라우저 콘솔에서 테스트
const testFluxMode = async () => {
  const response = await fetch('/api/canvas/image-brush', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      image: 'base64_image_data',
      mask: 'base64_mask_data',
      prompt: 'add floral pattern',
      mode: 'flux'
    })
  });
  console.log(await response.json());
};
```

### 2. I2I 모드 테스트
```javascript
// 브라우저 콘솔에서 테스트
const testI2IMode = async () => {
  const response = await fetch('/api/canvas/image-brush', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      image: 'base64_image_data',
      mask: 'base64_mask_data',
      referenceImage: 'base64_reference_data',
      styleStrength: 1.0,
      prompt: '',
      mode: 'i2i'
    })
  });
  console.log(await response.json());
};
```

### 3. Edge Function 로그 모니터링
```bash
# 실시간 로그 확인
npx supabase@latest functions logs image-brush \
  --project-ref YOUR_PROJECT_REF \
  --tail

# 에러 로그만 필터링
npx supabase@latest functions logs image-brush \
  --project-ref YOUR_PROJECT_REF \
  --tail | grep ERROR
```

## 🔍 문제 해결

### Edge Function 배포 실패
```bash
# 로컬에서 테스트
npx supabase@latest functions serve image-brush \
  --env-file .env.local

# CORS 문제 해결
# supabase/functions/_shared/cors.ts 파일 확인
```

### RunPod 연결 실패
1. RunPod 대시보드에서 Endpoint 상태 확인
2. API 키와 Endpoint ID 재확인
3. 크레딧 잔액 확인

### BFL API 오류
1. API 키 유효성 확인
2. 일일 사용량 제한 확인 (무료: 100회/일)
3. https://status.bfl.ai 에서 서비스 상태 확인

## 📊 모니터링

### Supabase Dashboard
- Edge Functions > image-brush > Logs
- Storage > user-uploads 폴더 확인
- Database > image_brush_history 테이블 확인

### Vercel Dashboard
- Functions 탭에서 API Route 실행 통계
- Logs 탭에서 에러 확인

### API 사용량
- BFL Dashboard: https://bfl.ai/dashboard
- RunPod Dashboard: https://runpod.io/console

## 🔒 보안 체크리스트

- [ ] Service Role Key가 클라이언트에 노출되지 않음
- [ ] 모든 환경 변수가 .gitignore에 포함됨
- [ ] RLS 비활성화로 직접 DB 접근 차단됨
- [ ] API Routes에서 인증 검증 구현됨
- [ ] Base64 이미지 크기 제한 (10MB)

## 📝 최종 확인

- [ ] 모든 환경 변수 설정 완료
- [ ] 데이터베이스 마이그레이션 성공
- [ ] Edge Function 배포 및 실행 확인
- [ ] FLUX 모드 테스트 성공
- [ ] I2I 모드 테스트 성공
- [ ] 프로덕션 배포 완료
- [ ] 로그 모니터링 설정

---

배포 완료 시간: _______________
배포 담당자: _______________
버전: v1.0.0 (I2I 모드 포함)