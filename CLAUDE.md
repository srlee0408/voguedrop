# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## VogueDrop 개발 가이드

VogueDrop은 AI 기반 패션 콘텐츠 생성 플랫폼입니다. 패션 크리에이터들이 정적 이미지를 AI 영상으로 변환하고 편집할 수 있습니다.

## Note
- Always answer in Korean.

## 핵심 문서 참조
개발 시 다음 문서를 반드시 참고하세요:
- `docs/prd.md` - 제품 요구사항과 Epic/Story 정의  
- `docs/fullstack-architecture.md` - 기술 스택과 시스템 설계
- `docs/frontend-architecture.md` - UI 구현 가이드
- `docs/ui-ux-spec.md` - 디자인 시스템과 UX 패턴

## 주요 개발 명령어
```bash
# 개발 서버 시작 (Turbopack 사용)
npm run dev

# 빌드
npm run build

# 프로덕션 서버 시작
npm run start

# 린트 검사
npm run lint

# 테스트 실행
npm run test

# 테스트 실행 (단일 실행)
npm run test:run
```

### 빌드 전 필수 체크
**중요**: 코드 작성 완료 후 반드시 `npm run lint`를 실행하여 타입 에러와 빌드 에러가 없는지 확인해야 합니다. 타입 에러가 있으면 프로덕션 배포가 실패합니다.

## 고수준 아키텍처

### 시스템 구조
- **Monorepo**: 단일 저장소에서 프론트엔드와 백엔드 통합 관리
- **Fullstack Framework**: Next.js 14+ App Router로 프론트엔드와 API 통합
- **Serverless**: Vercel Functions로 자동 스케일링
- **Database**: Supabase (PostgreSQL + Auth + Storage)
- **AI Integration**: fal.ai API로 영상 생성

### 주요 워크플로우
1. **AI 영상 생성 (Job-based Architecture)**:
   - 이미지 업로드 → Supabase Storage 저장
   - 효과 선택 (최대 2개) → job 생성 및 DB 기록
   - fal.ai API 비동기 호출 (webhook URL 포함)
   - 클라이언트 3초 간격 polling으로 진행상황 추적
   - Webhook 수신 시 job 상태 업데이트
   - 5분 후 webhook 미수신 시 fal.ai 직접 polling (fallback)
   - 완료된 영상 Supabase Storage 저장 및 메타데이터 업데이트
2. **사용자 인증**: Supabase Auth로 이메일/비밀번호 인증
3. **데이터 저장**: 생성된 영상과 메타데이터를 Supabase에 저장
4. **슬롯 기반 UI**: Canvas에서 4개 슬롯으로 컨텐츠 관리

## 프로젝트 구조 패턴

### Feature-First Co-location
```
app/
├── (feature)/           # 기능별 그룹화
│   ├── _components/     # 해당 기능 전용 컴포넌트
│   ├── _hooks/         # 해당 기능 전용 훅
│   └── page.tsx        # 라우트 페이지
├── api/                # API 라우트
│   └── [feature]/      # 기능별 API 엔드포인트
components/             # 공유 컴포넌트
├── ui/                # 기본 UI 요소
├── layout/            # 레이아웃 컴포넌트
└── modals/            # 공유 모달
```

### 타입 정의 구조
```
types/
├── database.ts        # Supabase 데이터베이스 타입
├── api.ts            # API 요청/응답 타입
└── [feature].ts      # 기능별 타입 (필요시)
```

### 데이터베이스 스키마
주요 테이블:
- `video_generations`: 영상 생성 작업 추적 (job_id, status, webhook 상태)
- `effect_templates`: AI 효과 템플릿 (카테고리별)
- `categories`: 효과 카테고리 관리
- `media_assets`: 파일 스토리지 관리
- `video_generation_logs`: 상세 로깅

## 코딩 표준

### TypeScript 필수 규칙
- `any` 타입 사용 금지 - 타입을 모를 때는 `unknown` 사용 후 타입 가드 적용
- 모든 함수에 명시적 반환 타입 정의
- interface로 props 정의, type은 유니온/인터섹션에 사용
- 빌드 시 타입 에러가 없어야 함 - `npm run build`로 확인

### 컴포넌트 패턴
```typescript
// 서버 컴포넌트 (기본)
export default async function PageName() {
  // 데이터 페칭
  return <div>...</div>;
}

// 클라이언트 컴포넌트 (상태/이벤트 필요시)
"use client";
export function ComponentName({ prop }: ComponentProps) {
  // 상태 관리
  return <div>...</div>;
}
```

### API 라우트 패턴
```typescript
// app/api/[feature]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export async function POST(request: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  // 인증 체크, 비즈니스 로직
  return NextResponse.json(result);
}
```

### 비동기 Job 처리 패턴
```typescript
// 1. Job 생성 및 비동기 작업 시작
POST /api/canvas/generate-async
- Job ID 생성 및 DB 기록
- fal.ai API 호출 (webhook URL 포함)
- Job ID 반환

// 2. 상태 확인 (Polling)
GET /api/canvas/jobs/[jobId]/poll
- DB에서 job 상태 확인
- 5분 이상 경과 시 fal.ai 직접 조회

// 3. Webhook 수신
POST /api/webhooks/fal
- 서명 검증
- Job 상태 업데이트
- 결과 저장
```

## 현재 개발 상태 (MVP)

### 완료된 기능
- ✅ **Epic 1**: 사용자 인증 시스템 (완료)
  - 이메일/비밀번호 회원가입 및 로그인
  - Supabase Auth 통합
  - 세션 관리 및 보호된 라우트
- ✅ **Epic 2**: Canvas AI Studio (완료)
  - 이미지 업로드 (드래그앤드롭 지원)
  - 효과 선택 UI (최대 2개 효과 선택)
  - AI 영상 생성 (fal.ai Hailo 모델)
  - 실시간 진행상황 추적
  - 영상 히스토리 및 즐겨찾기
  - 슬롯 기반 컨텐츠 관리 (4 슬롯)
  - 영상 다운로드 기능
- ✅ **Epic 3**: 갤러리 시스템 (완료)
  - 영상 목록 및 필터링
  - 반응형 그리드 레이아웃
  - 카테고리별 브라우징

### 기술적 구현 사항
- **Job 기반 비동기 처리**: 영상 생성 요청을 job으로 관리
- **Webhook 시스템**: fal.ai 서명 검증 및 상태 업데이트
- **Progress Tracking**: 실시간 진행률 시뮬레이션 및 표시
- **Fallback 메커니즘**: Webhook 실패 시 직접 polling
- **Favorites 기능**: 생성된 영상 즐겨찾기 관리
- **Stagewise 통합**: 개발 도구 통합 (포트 3100/3000)

## 환경 변수 설정
```bash
# .env.local (클라이언트에서 접근 가능)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_FAL_PUBLISHABLE_KEY=your-fal-publishable-key

# .env (서버 전용)
SUPABASE_SERVICE_KEY=your-service-key
FAL_API_KEY=your-fal-api-key
WEBHOOK_SECRET=your-webhook-secret
```

### Vercel 배포 설정
```json
// vercel.json
{
  "functions": {
    "app/api/canvas/generate-async/route.ts": {
      "maxDuration": 60
    }
  }
}
```

## 개발 시 주의사항

### Supabase 데이터 접근 보안
- **클라이언트 컴포넌트에서 Supabase 직접 접근 금지**: 민감한 정보(prompt, model_type 등)가 네트워크 탭에 노출되므로, 반드시 API Route를 통해 서버 사이드에서만 데이터베이스 접근
- **API 응답 최소화**: select('*') 사용 금지, 클라이언트에 필요한 최소한의 필드만 명시적으로 선택하여 반환
- **환경 변수 분리 철저**: NEXT_PUBLIC_ 접두사가 있는 환경 변수는 클라이언트에 노출되므로, Service Key 등 민감한 정보는 서버 전용 환경 변수로 관리

### MVP 집중
- 2주 내 출시 목표: 핵심 기능만 구현
- 데스크톱 우선: 1280x720 이상 해상도
- 인증 전까지 anonymous 사용자 지원

### 성능 최적화
- 이미지는 Next.js Image 컴포넌트 사용
- 동적 임포트로 코드 스플리팅
- 서버 컴포넌트 우선 사용

### 에러 처리
- 모든 API 호출에 try-catch 필수
- 사용자 친화적인 에러 메시지 표시
- 로딩 상태 표시 필수

### 코드 품질 체크
1. **작업 완료 후 필수 명령어 실행**:
   ```bash
   npm run lint      # ESLint 검사
   npm run build     # 타입 체크 및 빌드 테스트
   ```
2. **빌드 에러 발생 시**:
   - 타입 에러: 정확한 타입 정의 추가
   - ESLint 에러: 코드 스타일 수정
   - 의존성 에러: package.json 확인

## Git 워크플로우

### 브랜치 전략
```bash
# 기능 브랜치
feat/story-{epic}.{story}-{description}
예: feat/story-2.1-image-upload

# 버그 수정
fix/{issue-description}

# 리팩토링
refactor/{description}
```

### 커밋 메시지 형식
```
{type}: Story {epic}.{story} - {description}

- 상세 변경사항 1
- 상세 변경사항 2

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>
```

## 디버깅 팁

### Supabase 연결 문제
- Supabase 대시보드에서 API 설정 확인
- 환경 변수가 올바르게 설정되었는지 확인
- RLS 정책이 MVP에서는 비활성화되어 있는지 확인

### Next.js 라우팅 이슈
- 파일명이 `page.tsx`인지 확인
- 라우트 그룹 `()` 사용 시 URL에 영향 없음 확인
- 미들웨어가 올바른 경로를 매칭하는지 확인

### TypeScript 에러
- `npm run dev`로 실시간 타입 체크
- VS Code의 TypeScript 버전이 프로젝트와 일치하는지 확인
- `types/` 폴더의 타입 정의 확인
- **`npm run build` 실행 시 타입 에러 해결 방법**:
  - `@typescript-eslint/no-unused-vars`: 사용하지 않는 변수 제거
  - `@typescript-eslint/no-explicit-any`: `any` 대신 구체적인 타입 정의
  - React Hook 의존성 경고: `useCallback` 사용 또는 의존성 배열 업데이트
  - 타입 캐스팅이 필요한 경우: `as` 키워드 사용 (최소한으로)

### fal.ai API 디버깅
- Webhook 수신 확인: `/api/canvas/jobs/[jobId]/check-webhook` 엔드포인트 활용
- Progress 추적: VideoGenerationProgress 컴포넌트의 상태 표시 확인
- 로그 확인: video_generation_logs 테이블에서 상세 로그 조회

## BMAD 개발 프로세스 (Cursor Rules)
프로젝트는 BMAD(Business Model Accelerated Development) 방법론을 사용합니다:
- `.bmad-core/` 디렉토리에 개발 프로세스 정의
- Story 기반 개발: 각 기능은 Epic과 Story로 관리
- `@dev` 명령으로 개발자 페르소나 활성화 가능
- 개발 완료 시 Story 파일의 Dev Agent Record 섹션만 업데이트