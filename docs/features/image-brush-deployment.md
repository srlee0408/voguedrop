# Image Brush 기능 배포 가이드

## 개요
Image Brush는 AI를 활용한 이미지 인페인팅 기능으로, BFL FLUX Fill API를 통해 마스크 기반 이미지 편집을 제공합니다.

## 필수 사항

### 1. BFL API 토큰 발급
1. [BFL.ai](https://bfl.ai) 계정 생성
2. API Keys 섹션에서 토큰 생성
3. `.env.local`에 추가: `BFL_TOKEN=your-token`

### 2. Supabase 설정

#### 2.1 데이터베이스 테이블 생성
```bash
# Supabase 대시보드 SQL Editor에서 실행
# 또는 마이그레이션 파일 실행
npx supabase@latest db push --project-ref YOUR_PROJECT_REF
```

`supabase/migrations/20240119_create_image_brush_history.sql` 파일 내용을 실행하여 테이블 생성

**중요**: 이 테이블은 RLS가 **비활성화**되어 있습니다. 보안을 위해:
- 클라이언트에서 직접 접근 불가
- Next.js API Route를 통해서만 접근 가능
- Service Role Key 사용 필수

#### 2.2 Edge Function 배포
```bash
# 환경 변수 설정
export SUPABASE_ACCESS_TOKEN="your-access-token"

# Edge Function 배포
cd /Users/srlee/Desktop/커서개발/3. 서비스/voguedrop
npx supabase@latest functions deploy image-brush --project-ref YOUR_PROJECT_REF

# 배포 확인
npx supabase@latest functions list --project-ref YOUR_PROJECT_REF
```

#### 2.3 Edge Function 환경 변수 설정
```bash
# BFL API 토큰 설정 (필수)
npx supabase@latest secrets set BFL_TOKEN=your-bfl-token --project-ref YOUR_PROJECT_REF

# RunPod 설정 (선택사항 - I2I 모드용)
npx supabase@latest secrets set RUNPOD_API_KEY=your-key --project-ref YOUR_PROJECT_REF
npx supabase@latest secrets set RUNPOD_ENDPOINT_ID=your-id --project-ref YOUR_PROJECT_REF
```

### 3. 로컬 환경 설정

#### 3.1 환경 변수 파일 생성
`.env.local` 파일에 다음 추가:
```env
# Supabase Functions URL (필수)
NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL=https://YOUR_PROJECT_REF.supabase.co/functions/v1

# Supabase Service Key (필수 - 서버 사이드에서만 사용)
SUPABASE_SERVICE_KEY=your-service-role-key

# BFL Token (로컬 테스트용 - Edge Function에서는 별도 설정)
BFL_TOKEN=your-bfl-api-token
```

**보안 주의사항**:
- `SUPABASE_SERVICE_KEY`는 절대 클라이언트에 노출되면 안 됩니다
- `.env.local`은 `.gitignore`에 포함되어야 합니다
- Vercel 배포 시 Environment Variables에 안전하게 저장하세요

## 기능 테스트

### 1. 로컬 개발 서버 실행
```bash
npm run dev
```

### 2. 기능 테스트 순서
1. Canvas 페이지 접속 (`/canvas`)
2. 이미지 업로드 (드래그 앤 드롭 또는 클릭)
3. "Image Brush" 버튼 클릭
4. 마스크 영역 그리기 (브러시 도구 사용)
5. 프롬프트 입력 (예: "add floral pattern", "expand clothing")
6. "AI로 생성하기" 클릭
7. 처리 완료 후 결과 확인

### 3. Edge Function 로그 확인
```bash
# 실시간 로그 스트리밍
npx supabase@latest functions logs image-brush --project-ref YOUR_PROJECT_REF --tail

# 최근 100개 로그
npx supabase@latest functions logs image-brush --project-ref YOUR_PROJECT_REF --tail 100
```

## 트러블슈팅

### 🔴 문제: BFL API 에러
**증상**: "BFL API error: 401" 에러 발생

**해결**:
1. BFL 토큰이 올바른지 확인
2. Edge Function 환경 변수 재설정:
```bash
npx supabase@latest secrets set BFL_TOKEN=correct-token --project-ref YOUR_PROJECT_REF
```

### 🔴 문제: CORS 에러
**증상**: 브라우저 콘솔에 CORS 에러 표시

**해결**:
1. Edge Function이 OPTIONS 요청을 처리하는지 확인
2. `supabase/functions/_shared/cors.ts` 파일 확인
3. Edge Function 재배포

### 🔴 문제: 이미지 크기 제한
**증상**: "이미지 크기는 10MB를 초과할 수 없습니다" 에러

**해결**:
1. 클라이언트에서 이미지 리사이징 (최대 1024x1024)
2. Canvas 크기 제한 확인 (ImageBrushModal.tsx)

### 🔴 문제: 처리 시간 초과
**증상**: 2분 이상 처리 시 타임아웃

**해결**:
1. 이미지 크기 줄이기
2. 더 간단한 프롬프트 사용
3. BFL API 상태 확인 (https://status.bfl.ai)

## 프로덕션 배포

### 1. Vercel 배포
```bash
# 환경 변수 설정
vercel env add NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL

# 배포
vercel --prod
```

### 2. 모니터링
- Supabase Dashboard > Edge Functions에서 실행 통계 확인
- 에러 로그 모니터링
- API 사용량 추적 (BFL Dashboard)

## API 사용량 관리

### BFL API 제한
- 무료 티어: 100 요청/일
- 유료 티어: 요청당 과금
- 권장: 사용자별 일일 제한 구현

### 사용량 추적 (API Route 사용)
```javascript
// 히스토리 조회 API 호출
const response = await fetch('/api/canvas/image-brush/history?limit=10');
const { items, total } = await response.json();

// 특정 항목 삭제
await fetch('/api/canvas/image-brush/history', {
  method: 'DELETE',
  body: JSON.stringify({ id: itemId })
});
```

**주의**: RLS가 비활성화되어 있으므로 반드시 API Route를 통해서만 접근해야 합니다.

## 보안 고려사항

1. **API 키 보호**: 
   - Service Role Key는 서버 사이드에서만 사용
   - 절대 클라이언트 코드에 노출 금지
   - 환경 변수는 `.env.local`에만 저장

2. **데이터베이스 접근 제어**:
   - RLS 비활성화로 클라이언트 직접 접근 차단
   - 모든 데이터베이스 작업은 API Route를 통해서만 수행
   - Service Role Key로 서버 사이드 인증

3. **인증 필수**: 
   - 모든 API Route에서 JWT 토큰 검증
   - 사용자별 데이터 격리

4. **Rate Limiting**: 
   - 사용자별 요청 제한 구현 권장
   - BFL API 사용량 모니터링

5. **이미지 검증**: 
   - 업로드된 이미지 타입 및 크기 검증
   - Base64 크기 제한 (10MB)

## 성능 최적화

1. **이미지 압축**: 클라이언트에서 이미지 압축 후 전송
2. **캐싱**: 동일한 요청에 대한 결과 캐싱
3. **비동기 처리**: 긴 처리 시간을 위한 Job Queue 구현 고려

## 향후 개선사항

1. **I2I 모드 구현**: RunPod API 통합
2. **배치 처리**: 여러 이미지 동시 처리
3. **프리셋 저장**: 자주 사용하는 프롬프트 저장
4. **히스토리 관리**: 이전 편집 결과 관리 UI

## 참고 자료
- [BFL API Documentation](https://docs.bfl.ai)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Image Brush 구현 문서](/docs/task/task_image_brush.md)