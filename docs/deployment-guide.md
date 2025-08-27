# VogueDrop 배포 가이드

이 문서는 VogueDrop 프로젝트의 모든 배포 과정을 통합하여 설명합니다.

## 📋 목차

1. [개요](#개요)
2. [사전 준비](#사전-준비)
3. [AWS Lambda + Remotion 배포](#aws-lambda--remotion-배포)
4. [Supabase Edge Function 배포](#supabase-edge-function-배포)
5. [Image Brush 기능 배포](#image-brush-기능-배포)
6. [Vercel 프로덕션 배포](#vercel-프로덕션-배포)
7. [문제 해결](#문제-해결)
8. [배포 후 확인](#배포-후-확인)

## 개요

VogueDrop은 다음 서비스들을 통합하여 운영됩니다:
- **Vercel**: 메인 애플리케이션 호스팅
- **AWS Lambda**: 비디오 렌더링 (Remotion)
- **Supabase**: 데이터베이스, 인증, Edge Functions
- **fal.ai**: AI 비디오 생성
- **BFL.ai**: Image Brush 기능
- **RunPod**: I2I (Image-to-Image) 처리

## 사전 준비

### 1. 필수 계정 및 API 키
- [ ] AWS 계정 및 IAM 사용자
- [ ] Vercel 계정
- [ ] Supabase 프로젝트
- [ ] fal.ai API 토큰
- [ ] BFL.ai API 토큰
- [ ] RunPod API 키 및 Endpoint

### 2. 로컬 환경 설정

`.env.local` 파일 생성:
```env
# Supabase 기본 설정
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key
NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL=https://YOUR_PROJECT_REF.supabase.co/functions/v1

# AWS Lambda 설정 (비디오 렌더링)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=voguedrop-renders-{unique-id}
LAMBDA_FUNCTION_NAME=remotion-render-4-0-332-mem2048mb-disk2048mb-900sec
LAMBDA_RENDER_ENDPOINT=direct
REMOTION_SERVE_URL=https://remotionlambda-{id}.s3.amazonaws.com/sites/voguedrop/index.html

# AI 서비스 API 키
FAL_KEY=your-fal-api-key
BFL_TOKEN=your-bfl-api-token
RUNPOD_API_KEY=your-runpod-api-key
RUNPOD_ENDPOINT_ID=your-runpod-endpoint-id
```

## AWS Lambda + Remotion 배포

### 1. AWS 계정 설정

#### IAM 사용자 생성
```bash
# AWS CLI 설치 후 설정
aws configure
# Access Key ID, Secret Key, Region(us-east-1), Output format(json) 입력
```

#### 필요한 권한 정책
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "lambda:InvokeFunction",
        "lambda:GetFunction",
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": "*"
    }
  ]
}
```

### 2. S3 버킷 생성
```bash
# 고유한 버킷 이름으로 생성
aws s3 mb s3://voguedrop-renders-$(date +%Y%m%d)

# 공개 읽기 권한 설정
aws s3api put-bucket-policy --bucket voguedrop-renders-$(date +%Y%m%d) --policy '{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::voguedrop-renders-$(date +%Y%m%d)/*"
    }
  ]
}'
```

### 3. Remotion Lambda 배포
```bash
# 프로젝트 루트에서 실행
cd "/Users/srlee/Desktop/커서개발/3. 서비스/voguedrop"

# Remotion Lambda 함수 배포
npx remotion lambda functions deploy

# Remotion 사이트 배포
npx remotion lambda sites create src/remotion/index.ts --site-name=voguedrop

# 배포 확인
npx remotion lambda functions ls
npx remotion lambda sites ls
```

### 4. 로컬 테스트
```bash
# 개발 서버 시작
npm run dev

# Remotion Studio에서 미리보기
npm run remotion:studio
```

## Supabase Edge Function 배포

### 1. Supabase CLI 설치

**NPX 사용 (권장)**:
```bash
# 설치 없이 직접 실행
npx supabase@latest --version
```

**macOS (Homebrew)**:
```bash
brew install supabase/tap/supabase
```

### 2. 인증 설정
```bash
# 액세스 토큰 생성: https://app.supabase.com/account/tokens
export SUPABASE_ACCESS_TOKEN="your-token-here"

# 프로젝트 연결
npx supabase@latest link --project-ref YOUR_PROJECT_REF
```

### 3. Edge Function 배포
```bash
# upload-video 함수 배포
npx supabase@latest functions deploy upload-video --project-ref YOUR_PROJECT_REF

# image-brush 함수 배포 (Image Brush 기능용)
npx supabase@latest functions deploy image-brush --project-ref YOUR_PROJECT_REF --no-verify-jwt

# 배포 확인
npx supabase@latest functions list --project-ref YOUR_PROJECT_REF
```

### 4. 환경 변수 설정
```bash
# Edge Function용 환경 변수 설정
npx supabase@latest secrets set BFL_TOKEN=your-bfl-token --project-ref YOUR_PROJECT_REF
npx supabase@latest secrets set RUNPOD_API_KEY=your-key --project-ref YOUR_PROJECT_REF
npx supabase@latest secrets set RUNPOD_ENDPOINT_ID=your-id --project-ref YOUR_PROJECT_REF

# 설정 확인
npx supabase@latest secrets list --project-ref YOUR_PROJECT_REF
```

## Image Brush 기능 배포

### 1. 데이터베이스 마이그레이션
```sql
-- Supabase 대시보드 SQL Editor에서 실행
-- 또는 CLI 사용
npx supabase@latest db push --project-ref YOUR_PROJECT_REF
```

### 2. 기능 테스트
```javascript
// 브라우저 콘솔에서 FLUX 모드 테스트
const testFluxMode = async () => {
  const response = await fetch('/api/canvas/image-brush', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image: 'base64_image_data',
      mask: 'base64_mask_data',
      prompt: 'add floral pattern',
      mode: 'flux'
    })
  });
  console.log(await response.json());
};

// I2I 모드 테스트
const testI2IMode = async () => {
  const response = await fetch('/api/canvas/image-brush', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image: 'base64_image_data',
      mask: 'base64_mask_data',
      referenceImage: 'base64_reference_data',
      styleStrength: 1.0,
      mode: 'i2i'
    })
  });
  console.log(await response.json());
};
```

## Vercel 프로덕션 배포

### 1. 환경 변수 설정
Vercel 대시보드에서 다음 환경 변수 설정:

```bash
# 또는 CLI 사용
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL
vercel env add SUPABASE_SERVICE_KEY
vercel env add AWS_ACCESS_KEY_ID
vercel env add AWS_SECRET_ACCESS_KEY
vercel env add AWS_REGION
vercel env add AWS_S3_BUCKET_NAME
vercel env add LAMBDA_FUNCTION_NAME
vercel env add LAMBDA_RENDER_ENDPOINT
vercel env add REMOTION_SERVE_URL
vercel env add FAL_KEY
vercel env add BFL_TOKEN
vercel env add RUNPOD_API_KEY
vercel env add RUNPOD_ENDPOINT_ID
```

### 2. 배포 실행
```bash
# 프로덕션 배포
vercel --prod

# 또는 GitHub 연동으로 자동 배포
```

### 3. vercel.json 설정
```json
{
  "functions": {
    "app/api/video/render/route.ts": {
      "maxDuration": 60
    }
  },
  "env": {
    "AWS_LAMBDA_FUNCTION_TIMEOUT": "900"
  }
}
```

## 문제 해결

### 1. Lambda 권한 에러
**증상**: `User is not authorized to perform: lambda:InvokeFunction`

**해결책**:
```bash
# IAM 정책 확인
aws iam list-attached-user-policies --user-name your-iam-user

# 필요시 정책 연결
aws iam attach-user-policy \
  --user-name your-iam-user \
  --policy-arn arn:aws:iam::aws:policy/AWSLambda_FullAccess
```

### 2. Edge Function 인증 실패
**증상**: "로그인이 필요합니다" 에러

**해결책**: Supabase 클라이언트 올바른 생성
```typescript
// ❌ 잘못된 코드
const supabaseAuth = createClient(supabaseUrl, token);

// ✅ 올바른 코드
const supabaseAuth = createClient(supabaseUrl, supabaseAnon, {
  global: {
    headers: { Authorization: `Bearer ${token}` }
  }
});
```

### 3. 504 Gateway Timeout
**원인**: 대용량 파일 업로드 시 타임아웃

**해결책**:
- 파일 크기 제한 (10MB 이하)
- 클라이언트 타임아웃 연장
- 압축 적용

### 4. CORS 에러
**해결책**: `supabase/functions/_shared/cors.ts` 파일 확인
```typescript
if (req.method === 'OPTIONS') {
  return new Response('ok', { headers: corsHeaders });
}
```

## 배포 후 확인

### 1. 기능별 테스트 체크리스트
- [ ] 사용자 인증 (로그인/회원가입)
- [ ] Canvas 이미지 업로드
- [ ] AI 비디오 생성 (fal.ai)
- [ ] Image Brush 기능 (FLUX/I2I 모드)
- [ ] Video Editor 기능
- [ ] 파일 업로드 (Supabase Storage)
- [ ] 비디오 렌더링 (AWS Lambda)

### 2. 로그 모니터링
```bash
# Vercel 함수 로그
vercel logs --follow

# Supabase Edge Function 로그
npx supabase@latest functions logs upload-video --project-ref YOUR_PROJECT_REF --tail

# AWS CloudWatch 로그
aws logs tail /aws/lambda/remotion-render-4-0-332-mem2048mb-disk2048mb-900sec --follow
```

### 3. 성능 확인
- Vercel Analytics에서 페이지 로드 시간 확인
- Supabase Dashboard에서 API 응답 시간 확인
- AWS CloudWatch에서 Lambda 실행 시간 확인

### 4. 보안 체크리스트
- [ ] 모든 API 키가 환경 변수로 설정됨
- [ ] Service Role Key가 클라이언트에 노출되지 않음
- [ ] RLS 정책이 올바르게 설정됨
- [ ] CORS 설정이 적절함

## 비용 관리

### 예상 월 비용 (1000명 사용자 기준)
- **Vercel Pro**: $20/월
- **Supabase Pro**: $25/월
- **AWS Lambda**: $5-10/월 (1000회 렌더링)
- **AWS S3**: $2-5/월 (100GB 저장)
- **fal.ai**: 사용량에 따라 변동
- **BFL.ai**: 무료 티어 100회/일

### 비용 절감 팁
1. 불필요한 파일 자동 삭제 설정
2. Lambda 메모리 최적화
3. S3 Lifecycle 정책 설정
4. Vercel 함수 실행 시간 최적화

---

**배포 완료 시간**: _______________  
**배포 담당자**: _______________  
**버전**: v2.0.0 (통합 가이드)
