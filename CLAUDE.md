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
- `docs/video-render-setup-guide.md` - Remotion 렌더링 설정

## 주요 개발 명령어
```bash
# 개발 서버 시작 (Turbopack 사용)
npm run dev:turbo

# 개발 서버 시작 (표준)
npm run dev

# 빌드
npm run build

# 프로덕션 서버 시작
npm run start

# 린트 검사
npm run lint

# 테스트 실행 (watch 모드)
npm run test

# 테스트 실행 (단일 실행)
npm run test:run

# 폰트 렌더링 테스트
npm run test:font-render

# Remotion Studio 실행 (비디오 편집 개발)
npm run remotion:studio

# Remotion 비디오 렌더링
npm run remotion:render

# Remotion Lambda 배포
npm run remotion:lambda:deploy

# Remotion Lambda 사이트 생성
npm run remotion:lambda:sites

# 모든 폰트 다운로드 (초기 설정)
./scripts/download-all-fonts.sh
```

### 빌드 전 필수 체크
**중요**: 코드 작성 완료 후 반드시 `npm run lint`와 `npm run build`를 실행하여 타입 에러와 빌드 에러가 없는지 확인해야 합니다. 타입 에러가 있으면 프로덕션 배포가 실패합니다.

## 고수준 아키텍처

### 시스템 구조
- **Monorepo**: 단일 저장소에서 프론트엔드와 백엔드 통합 관리
- **Fullstack Framework**: Next.js 14+ App Router로 프론트엔드와 API 통합
- **Serverless**: Vercel Functions로 자동 스케일링
- **Database**: Supabase (PostgreSQL + Auth + Storage)
- **AI Integration**: fal.ai API로 영상 생성
- **Video Editing**: Remotion으로 클라이언트 사이드 비디오 편집 및 렌더링
- **Security**: RLS 대신 Next.js API Route로 보안을 관리함

### 주요 워크플로우
1. **AI 영상 생성 (Job-based Architecture)**:
   - 이미지 업로드 → Supabase Storage 저장
   - 효과 선택 (최대 2개) → job 생성 및 DB 기록
   - fal.ai API 비동기 호출 (webhook URL 포함)
   - 클라이언트 3초 간격 polling으로 진행상황 추적
   - Webhook 수신 시 job 상태 업데이트
   - 5분 후 webhook 미수신 시 fal.ai 직접 polling (fallback)
   - 완료된 영상 Supabase Storage 저장 및 메타데이터 업데이트

2. **영상 업로드 (Supabase Edge Function)**:
   - 대용량 파일 지원: 최대 50MB (Vercel 4.5MB 제한 우회)
   - 클라이언트 → Edge Function → Supabase Storage 직접 저장
   - 자동 썸네일 생성 및 메타데이터 추출
   - `lib/api/upload.ts`의 uploadVideo 함수 사용

3. **비디오 편집 (Remotion)**:
   - Video Editor에서 클립 타임라인 관리
   - Remotion Player로 실시간 프리뷰
   - AWS Lambda 또는 서버 사이드 렌더링으로 최종 영상 생성
   - 생성된 영상 Supabase Storage 저장

4. **사용자 인증**: Supabase Auth로 이메일/비밀번호 인증
5. **데이터 저장**: 생성된 영상과 메타데이터를 Supabase에 저장
6. **슬롯 기반 UI**: Canvas에서 4개 슬롯으로 컨텐츠 관리

## 프로젝트 구조 패턴

### Feature-First Co-location
```
app/
├── (feature-group)/              # 라우트 그룹 (URL에 영향 없음)
│   ├── feature-page/
│   │   ├── page.tsx             # 페이지 컴포넌트
│   │   ├── layout.tsx           # 레이아웃 (선택사항)
│   │   ├── _components/         # 기능 전용 컴포넌트
│   │   │   ├── index.ts         # 배럴 export
│   │   │   ├── ComponentA.tsx
│   │   │   └── ComponentB.tsx
│   │   ├── _hooks/              # 기능 전용 훅
│   │   │   ├── index.ts
│   │   │   └── useFeature.ts
│   │   ├── _context/            # 기능 전용 컨텍스트
│   │   │   └── FeatureContext.tsx
│   │   ├── _utils/              # 기능 전용 유틸리티
│   │   │   └── helpers.ts
│   │   └── _types/              # 기능 전용 타입
│   │       └── index.ts
│   └── another-feature/
│
├── api/                         # API 라우트
│   └── feature/
│       └── route.ts            # HTTP 메서드 export
│
components/                      # 공유 컴포넌트
├── ui/                         # 기본 UI 요소
│   ├── Button.tsx
│   └── index.ts
├── layout/                     # 레이아웃 컴포넌트
└── modals/                     # 공유 모달

lib/                            # 유틸리티 및 설정
├── supabase/
│   ├── client.ts
│   └── server.ts
├── utils/
└── constants/

types/                          # 글로벌 타입 정의
├── database.ts
├── api.ts
├── env.d.ts                    # 환경 변수 타입
└── index.ts

src/remotion/                   # Remotion 비디오 컴포지션
├── index.ts                    # Remotion 엔트리 포인트
└── compositions/               # 비디오 컴포지션 컴포넌트
```

### Import 순서 규칙
```typescript
// 1. React/Next.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// 2. 외부 라이브러리
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// 3. 절대 경로 import (@/)
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/auth';

// 4. 상대 경로 import
import { LocalComponent } from './_components/LocalComponent';
import { useLocalHook } from './_hooks/useLocalHook';

// 5. 타입 import (별도 그룹)
import type { User } from '@/types/database';
import type { ComponentProps } from './types';
```

### 타입 정의 구조
```
types/
├── database.ts        # Supabase 데이터베이스 타입
├── canvas.ts          # Canvas 기능 타입
├── video-editor.ts    # 비디오 에디터 타입
├── sound.ts          # 사운드 관련 타입
├── auth.ts           # 인증 관련 타입
└── env.d.ts          # 환경 변수 타입 정의
```

#### 환경 변수 타입 정의 예시
```typescript
// types/env.d.ts
declare namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_SUPABASE_URL: string;
    NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
    SUPABASE_SERVICE_KEY: string;
    FAL_API_KEY: string;
    WEBHOOK_SECRET: string;
  }
}
```

#### Supabase 타입 안전한 쿼리
```typescript
// types/database.ts에 타입 정의
export interface VideoGenerationWithEffects extends VideoGeneration {
  effects: EffectTemplate[];
  user: User;
}

// 사용 예시
const { data, error } = await supabase
  .from('video_generations')
  .select('*, effects:effect_templates(*), user:users(*)')
  .returns<VideoGenerationWithEffects[]>();
```

### 데이터베이스 스키마
주요 테이블:
- `video_generations`: 영상 생성 작업 추적 (job_id, status, webhook 상태)
- `effect_templates`: AI 효과 템플릿 (카테고리별)
- `categories`: 효과 카테고리 관리
- `media_assets`: 파일 스토리지 관리
- `video_generation_logs`: 상세 로깅
- `project_saves`: 비디오 에디터 프로젝트 저장
- `sound_generations`: 사운드 생성 작업 추적

## 코딩 표준 및 에러 방지 가이드

### TypeScript 필수 규칙
- **`any` 타입 절대 금지** - 타입을 모를 때는 `unknown` 사용 후 타입 가드 적용
- **모든 함수에 명시적 반환 타입 정의**
- **interface로 props 정의, type은 유니온/인터섹션에 사용**
- **빌드 시 타입 에러가 없어야 함** - `npm run build`로 확인
- **엄격한 null 체크** - optional chaining(`?.`)과 nullish coalescing(`??`) 활용

#### 올바른 타입 정의 예시
```typescript
// ❌ 잘못된 예시
function getData(id) {  // 매개변수와 반환 타입 없음
  const result: any = fetchData(id);  // any 사용
  return result.data;  // null 체크 없음
}

// ✅ 올바른 예시
function getData(id: string): Promise<DataType | null> {
  const result: unknown = await fetchData(id);
  if (isDataType(result)) {  // 타입 가드
    return result.data ?? null;  // nullish coalescing
  }
  return null;
}
```

### React/Next.js ESLint 규칙

#### React Hook 의존성 배열 관리
```typescript
// ❌ 문제: cleanup 함수에서 ref 직접 접근
useEffect(() => {
  return () => {
    fontLoadHandles.current.clear();  // ref가 변경될 수 있음
  };
}, [textClips]);

// ✅ 해결: 로컬 변수에 복사
useEffect(() => {
  const handles = fontLoadHandles.current;
  return () => {
    handles.clear();
  };
}, [textClips]);
```

#### Async 함수 처리
```typescript
// ❌ useEffect에 async 직접 사용 불가
useEffect(async () => {
  await fetchData();
}, []);

// ✅ 내부 async 함수 정의
useEffect(() => {
  const loadData = async () => {
    await fetchData();
  };
  loadData();
}, []);

### 컴포넌트 패턴

#### 서버 컴포넌트 (기본)
```typescript
// app/feature/page.tsx
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Feature Page',
};

export default async function PageName() {
  // 서버에서 데이터 페칭
  const data = await fetchData();
  return (
    <div>
      <ClientComponent initialData={data} />
    </div>
  );
}
```

#### 클라이언트 컴포넌트
```typescript
// app/feature/_components/ClientComponent.tsx
'use client';

interface ClientComponentProps {
  initialData: DataType;
  onAction?: (id: string) => void;
}

export function ClientComponent({ initialData, onAction }: ClientComponentProps) {
  const [data, setData] = useState(initialData);
  
  return <div>{/* UI */}</div>;
}
```

### API 라우트 패턴
```typescript
// app/api/[feature]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

// 요청 스키마 정의
const requestSchema = z.object({
  field: z.string().min(1),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // 1. 인증 체크
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // 2. 요청 검증
    const body = await request.json();
    const validated = requestSchema.parse(body);
    
    // 3. 비즈니스 로직
    const result = await processData(validated);
    
    return NextResponse.json({ data: result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 커스텀 Hook 패턴
```typescript
// app/feature/_hooks/useFeature.ts
import { useState, useCallback, useEffect } from 'react';

interface UseFeatureOptions {
  autoLoad?: boolean;
}

interface UseFeatureReturn {
  data: DataType | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useFeature(
  id: string,
  options: UseFeatureOptions = {}
): UseFeatureReturn {
  const { autoLoad = true } = options;
  const [data, setData] = useState<DataType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetchData(id);
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [id]);
  
  useEffect(() => {
    if (autoLoad) {
      fetch();
    }
  }, [autoLoad, fetch]);
  
  return { data, loading, error, refetch: fetch };
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
POST /api/webhooks/fal-ai
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

- 🚧 **Epic 4**: Video Editor (진행 중)
  - ✅ Remotion 통합 및 프리뷰
  - ✅ 타임라인 UI 및 클립 관리
  - ✅ 텍스트/사운드 클립 추가
  - ✅ 클립 복제/분할/트림 기능
  - ✅ 실행 취소/다시 실행
  - 🚧 서버 사이드 렌더링 (AWS Lambda)

### 기술적 구현 사항
- **Job 기반 비동기 처리**: 영상 생성 요청을 job으로 관리
- **Webhook 시스템**: fal.ai 서명 검증 및 상태 업데이트
- **Progress Tracking**: 실시간 진행률 시뮬레이션 및 표시
- **Fallback 메커니즘**: Webhook 실패 시 직접 polling
- **Favorites 기능**: 생성된 영상 즐겨찾기 관리
- **Stagewise 통합**: 개발 도구 통합 (포트 3100/3000)
- **Remotion Integration**: 클라이언트 사이드 비디오 편집 및 렌더링

## 환경 변수 설정
```bash
# .env.local (클라이언트에서 접근 가능)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_FAL_PUBLISHABLE_KEY=your-fal-publishable-key
NEXT_PUBLIC_MOCK_MODE=false  # true로 설정 시 AI API 호출 대신 목업 사용

# .env (서버 전용)
SUPABASE_SERVICE_KEY=your-service-key
FAL_API_KEY=your-fal-api-key
WEBHOOK_SECRET=your-webhook-secret
REMOTION_AWS_ACCESS_KEY_ID=your-aws-access-key
REMOTION_AWS_SECRET_ACCESS_KEY=your-aws-secret

# AWS Lambda 관련 (선택사항)
AWS_S3_BUCKET_NAME=voguedrop-renders
AWS_REGION=us-east-1
LAMBDA_FUNCTION_NAME=voguedrop-render
```

### Vercel 배포 설정
```json
// vercel.json
{
  "functions": {
    "app/api/canvas/generate-async/route.ts": {
      "maxDuration": 60
    },
    "app/api/video/render/route.ts": {
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

### Remotion 비디오 편집
- **Player 상태 동기화**: currentFrame 업데이트 시 타임라인과 프리뷰 동기화 필수
- **클립 오버레이**: z-index와 레이어 순서 관리 주의
- **렌더링 성능**: 실시간 프리뷰는 클라이언트, 최종 렌더링은 서버 사이드 처리

### MVP 집중
- 2주 내 출시 목표: 핵심 기능만 구현
- 데스크톱 우선: 1280x720 이상 해상도
- 인증 전까지 anonymous 사용자 지원

### 성능 최적화
- 이미지는 Next.js Image 컴포넌트 사용
- 동적 임포트로 코드 스플리팅
- 서버 컴포넌트 우선 사용
- Remotion 컴포지션은 필요 시점에만 로드

### 에러 처리
- 모든 API 호출에 try-catch 필수
- 사용자 친화적인 에러 메시지 표시
- 로딩 상태 표시 필수
- Job 실패 시 재시도 로직 구현

### 코드 품질 체크
1. **작업 완료 후 필수 명령어 실행**:
   ```bash
   npm run lint      # ESLint 검사
   npm run build     # 타입 체크 및 빌드 테스트
   npm run test:run  # 테스트 실행
   ```
2. **빌드 에러 발생 시**:
   - 타입 에러: 정확한 타입 정의 추가
   - ESLint 에러: 코드 스타일 수정
   - 의존성 에러: package.json 확인

### 테스트 실행
```bash
# Vitest를 사용한 테스트
npm run test         # Watch 모드로 테스트 실행
npm run test:run     # 단일 실행 (CI/CD용)

# 특정 파일만 테스트
npm run test -- path/to/test.test.ts

# 커버리지 확인
npm run test -- --coverage
```

테스트 파일은 `*.test.ts` 또는 `*.test.tsx` 형식으로 작성하며, `@testing-library/react`를 사용합니다.

### 흔한 에러 및 해결 방법

#### 1. React Hook 의존성 경고
```
ESLint: React Hook useEffect has a missing dependency: '...'
```
**해결**: ESLint가 제안하는 의존성을 배열에 추가하거나, 의도적인 경우 주석 처리

#### 2. TypeScript 타입 에러
```
Property '...' does not exist on type 'unknown'
```
**해결**: 타입 가드를 사용하여 타입 좁히기
```typescript
if (data && typeof data === 'object' && 'property' in data) {
  // data.property 접근 가능
}
```

#### 3. Async 컴포넌트 에러
```
Error: Objects are not valid as a React child
```
**해결**: 서버 컴포넌트에서만 async 사용, 클라이언트 컴포넌트는 useEffect 활용

#### 4. Import 경로 에러
```
Cannot find module '@/...'
```
**해결**: tsconfig.json의 paths 설정 확인, 상대 경로 사용 고려

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
{type}: {description}

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

### 에러 처리 패턴
```typescript
// lib/errors.ts
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// 사용 예시
try {
  const result = await riskyOperation();
} catch (error) {
  if (error instanceof AppError) {
    // 앱 에러 처리
    console.error(`Error ${error.code}: ${error.message}`);
  } else if (error instanceof Error) {
    // 일반 에러 처리
    console.error(error.message);
  } else {
    // unknown 에러 처리
    console.error('Unknown error occurred');
  }
}
```

### fal.ai API 디버깅
- Webhook 수신 확인: `/api/canvas/jobs/[jobId]/check-webhook` 엔드포인트 활용
- Progress 추적: VideoGenerationProgress 컴포넌트의 상태 표시 확인
- 로그 확인: video_generation_logs 테이블에서 상세 로그 조회
- Mock 모드: `NEXT_PUBLIC_MOCK_MODE=true`로 AI API 호출 없이 테스트

### Remotion 렌더링 이슈
- Remotion Studio에서 컴포지션 미리보기: `npm run remotion:studio`
- 프레임 레이트 확인: 기본 30fps 설정 (`remotion.config.ts`에서 조정 가능)
- 메모리 사용량 모니터링: 긴 영상 렌더링 시 주의
- AWS Lambda 설정: `docs/video-render-setup-guide.md` 참조
- 폰트 로딩 이슈: `./scripts/download-all-fonts.sh` 실행하여 필요한 폰트 다운로드
- Lambda 함수 메모리: 3008MB (최대), 타임아웃: 15분 설정

## 추가 설정 파일
- `remotion.config.ts` - Remotion 렌더링 설정 (코덱, 비트레이트, Lambda 설정)
- `vitest.config.ts` - 테스트 환경 설정 (jsdom, React Testing Library)
- `eslint.config.mjs` - ESLint 설정 (Next.js 코어 웹 바이탈 규칙)
- `scripts/download-all-fonts.sh` - Google Fonts에서 프로젝트 폰트 다운로드

## Cursor Rules 통합
프로젝트는 다음 Cursor Rules를 포함합니다:
- `.cursor/rules/canvas-implementation-guide.mdc` - Canvas 페이지 구현 가이드
  - 4 슬롯 시스템 상태 관리
  - 이미지 업로드 및 효과 선택 플로우
  - Job 기반 비동기 영상 생성 패턴