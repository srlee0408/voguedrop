# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## VogueDrop 개발 가이드

VogueDrop은 AI 기반 패션 콘텐츠 생성 플랫폼입니다. 패션 크리에이터들이 정적 이미지를 AI 영상으로 변환하고 편집할 수 있습니다.

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

# 타입 체크 (package.json에 추가 필요)
npm run type-check
```

### 빌드 전 필수 체크
**중요**: 코드 작성 완료 후 반드시 `npm run build`를 실행하여 타입 에러와 빌드 에러가 없는지 확인해야 합니다. 타입 에러가 있으면 프로덕션 배포가 실패합니다.

## 고수준 아키텍처

### 시스템 구조
- **Monorepo**: 단일 저장소에서 프론트엔드와 백엔드 통합 관리
- **Fullstack Framework**: Next.js 14+ App Router로 프론트엔드와 API 통합
- **Serverless**: Vercel Functions로 자동 스케일링
- **Database**: Supabase (PostgreSQL + Auth + Storage)
- **AI Integration**: fal.ai API로 영상 생성

### 주요 워크플로우
1. **AI 영상 생성**: 이미지 업로드 → 효과 선택 → fal.ai API 호출 → 영상 생성
2. **사용자 인증**: Supabase Auth로 이메일/비밀번호 인증
3. **데이터 저장**: 생성된 영상과 메타데이터를 Supabase에 저장

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

## 현재 개발 상태 (MVP)

### 완료된 기능
- 프로젝트 초기 설정
- 기본 레이아웃 구조
- 갤러리 아이템 컴포넌트

### 진행 중인 Epic
- **Epic 2**: Canvas AI Studio (Story 2.1 진행 중)
  - 이미지 업로드 기능 구현 필요
  - 효과 선택 UI 구현 필요
  - AI 생성 API 연동 필요

### 다음 단계
1. Story 2.1: 이미지 업로드 완성
2. Story 2.2: 효과 선택 UI
3. Story 2.3: AI 영상 생성
4. Story 2.4: 영상 미리보기 및 다운로드

## 환경 변수 설정
```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# .env (서버 전용)
SUPABASE_SERVICE_KEY=your-service-key
FAL_API_KEY=your-fal-api-key
```

## 개발 시 주의사항

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