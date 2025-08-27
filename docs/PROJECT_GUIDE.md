# Voguedrop 프로젝트 가이드

이 문서는 Voguedrop 프로젝트의 원활한 협업을 위한 코드 컨벤션, 아키텍처, 주요 라이브러리 사용법을 정의합니다.

## 1. 코드 컨벤션

### 1.1. 네이밍 규칙

- **컴포넌트:** `PascalCase`를 사용합니다. (예: `MyComponent`, `Header`)
- **함수/변수:** `camelCase`를 사용합니다. (예: `getUser`, `userName`)
- **타입/인터페이스:** `PascalCase`를 사용하며, 필요한 경우 `T` 접두사를 사용할 수 있습니다. (예: `User`, `TButtonProps`)
- **파일 (컴포넌트):** `kebab-case` 또는 `PascalCase`를 사용하되, 일관성을 유지합니다. 현재 프로젝트는 `PascalCase`를 주로 사용합니다. (예: `HeroSection.tsx`, `Footer.tsx`)
- **파일 (일반):** `kebab-case`를 사용합니다. (예: `user-api.ts`)

### 1.2. 파일 구조 및 폴더 명명 (Features 기반 아키텍처)

#### 🎯 **Features 모듈 (도메인별 분리)**
- **`src/features/`**: 기능별 독립 모듈 - 도메인 주도 설계(DDD) 적용
  - `canvas-generation/`: AI 영상 생성 기능
    - `_components/`: 컴포넌트 (slots/, effects/, progress/, history/로 세분화)
    - `_hooks/`: 전용 훅
    - `_api/`: API 호출 함수
    - `_store/`: 상태 관리 (Zustand 권장)
    - `_types/`: 타입 정의
  - `video-editing/`: 비디오 편집 기능
    - `_components/`: 컴포넌트 (timeline/, preview/, clips/로 세분화)
    - `_hooks/`: 전용 훅
    - `_utils/`: 유틸리티 함수
    - `_store/`: 상태 관리
  - `media-library/`: 미디어 라이브러리
  - `user-auth/`: 사용자 인증
  - `sound-generation/`: 사운드 생성

#### 🌐 **Infrastructure 레이어 (외부 서비스)**
- **`src/infrastructure/`**: 외부 서비스 통합 관리
  - `supabase/`: 데이터베이스 클라이언트 (통합됨)
  - `ai-services/`: AI API 서비스 (fal.ai, webhooks)
  - `video-processing/`: 비디오 처리 (Remotion)
  - `cache/`: 캐싱 관리

#### 🎨 **App 라우팅 (Presentation Layer)**
- **`src/app`**: Next.js App Router 기반 라우팅 - 페이지만 담당
  - `(group)`: 라우트 그룹 사용 (URL 경로에서 제외)
  - `canvas/`: Canvas 페이지 (구 컴포넌트들은 features/로 이동됨)
  - `video-editor/`: 비디오 에디터 페이지
  - `gallery/`: 갤러리 페이지
  - `api/`: API 라우트

#### 🔄 **Shared 자원**
- **`src/shared/`**: 공통 사용 자원
  - `ui/`: shadcn/ui 기반 UI 컴포넌트
  - `hooks/`: 전역 재사용 훅
  - `utils/`: 공통 유틸리티 (cn 함수 등)
  - `types/`: 전역 타입 정의

### 1.3. 주석

- 복잡한 로직이나 특정 결정에 대한 이유를 설명할 때 주석을 작성합니다.
- `//`를 사용한 한 줄 주석을 권장합니다.
- JSDoc 형식으로 함수의 매개변수와 반환 값에 대한 설명을 추가할 수 있습니다.
- import 관련 주석은 쓰지 않습니다.

### 1.4. 코딩 스타일

- **들여쓰기**: 2칸(space)을 사용합니다.
- **따옴표**: `"`(큰따옴표) 사용을 권장합니다. (`prettier` 설정에 따름)
- **세미콜론**: 생략합니다. (`prettier` 설정에 따름)
- **Linter/Formatter**: `ESLint`와 `Prettier`를 사용하여 코드 스타일을 일관되게 유지합니다. 저장 시 자동으로 포맷팅되도록 설정하는 것을 권장합니다.

## 2. 사용할 컴포넌트/라이브러리

### 2.1. UI 컴포넌트

- **기반**: **shadcn/ui**
- **아이콘**: `lucide-react`를 사용합니다.
- **설명**: 재사용 가능하고 접근성 높은 UI 컴포넌트 라이브러리. `components.json`을 통해 관리됩니다.
- **import 경로**: `@/components/ui/{component-name}` (예: `import { Button } from "@/components/ui/button"`)
- **스타일링**: **Tailwind CSS**의 유틸리티 클래스를 사용합니다.

### 2.2. 상태 관리

- **주요 방식**: **React Query (`@tanstack/react-query`)** + **React Context**
- **React Query**: 서버 상태(Server State) 관리에 사용됩니다. API 데이터 캐싱, 동기화, 업데이트를 처리합니다.
- **React Context**: 클라이언트 상태(Client State) 중 전역적으로 필요한 상태(예: 유저 정보, 테마) 관리에 사용됩니다. (예: `useUser` 훅)
- **Zustand/Redux**: 현재 프로젝트에서는 도입되지 않았습니다. 필요 시 팀 논의 후 도입할 수 있습니다.

### 2.3. 스타일링

- **주요 방식**: **Tailwind CSS**
- **설명**: 유틸리티 우선(utility-first) CSS 프레임워크로, HTML 내에서 직접 스타일을 정의합니다.
- **클래스 병합**: `clsx`와 `tailwind-merge`를 결합한 `cn` 유틸리티 함수를 사용합니다.
  ```typescript
  // src/lib/utils.ts
  import { type ClassValue, clsx } from "clsx"
  import { twMerge } from "tailwind-merge"

  export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
  }
  ```

### 2.4. 필수 의존성 패키지

- `next`: 프레임워크
- `react`, `react-dom`: UI 라이브러리
- `@supabase/ssr`, `@supabase/supabase-js`: 백엔드(BaaS) 및 인증
- `@tanstack/react-query`: 서버 상태 관리
- `tailwindcss`: 스타일링
- `shadcn/ui` 관련 (`@radix-ui/*`, `class-variance-authority`, `clsx`, `tailwind-merge`)
- `remotion`: 비디오 렌더링

## 3. 수정할 때 주의사항
수정할 때 다른 곳에 기능, 또는 구현 ui,ux등  영향을 주지 않는지 파악하고 개발을 진행해라.

## 4. 폴더별 상세 가이드

### 4.1. Features 모듈 개발 가이드

#### 🎨 **Canvas Generation (AI 영상 생성)**
```
src/features/canvas-generation/
├── _components/
│   ├── slots/           # 슬롯 관리 컴포넌트
│   │   ├── Canvas.tsx   # 메인 캔버스
│   │   └── CanvasSlot.tsx
│   ├── effects/         # 효과 관련
│   │   ├── EffectsGallery.tsx
│   │   └── EffectsSection.tsx
│   ├── progress/        # 진행 상황
│   │   └── VideoGenerationProgress.tsx
│   └── history/         # 히스토리
│       └── CanvasHistoryPanel.tsx
├── _hooks/
│   ├── useSlotManager.ts    # 슬롯 상태 관리
│   ├── useVideoGeneration.ts # 영상 생성 로직
│   └── useEffectsManager.ts  # 효과 관리
├── _api/
│   └── api.ts           # Canvas API 호출 함수
├── _store/              # 상태 관리 (향후 Zustand)
└── _types/
    └── index.ts         # Canvas 전용 타입
```

**역할**: 4개 슬롯 기반 AI 영상 생성, 효과 적용, 진행상황 추적

#### ✂️ **Video Editing (비디오 편집)**
```
src/features/video-editing/
├── _components/
│   ├── timeline/        # 타임라인 관련
│   │   ├── Timeline.tsx # 메인 타임라인 (God Component 분할됨)
│   │   ├── TimelineTrack.tsx
│   │   ├── TimelineClip.tsx
│   │   └── TimelinePlayhead.tsx
│   ├── preview/         # 프리뷰
│   │   ├── VideoPreview.tsx
│   │   └── PreviewSection.tsx
│   └── clips/           # 클립 타입별
│       ├── VideoClip.tsx
│       ├── AudioClip.tsx
│       └── TextClip.tsx
├── _hooks/
│   ├── useTimeline.ts   # 타임라인 로직
│   ├── usePlayback.ts   # 재생 제어
│   └── useClips.ts      # 클립 관리
├── _utils/
│   ├── timeline-utils.ts
│   ├── clip-operations.ts
│   └── common-clip-utils.ts
└── _store/              # Context → Zustand 전환 예정
```

**역할**: Remotion 기반 비디오 편집, 타임라인 관리, 클립 조작

#### 📚 **Media Library (미디어 라이브러리)**
```
src/features/media-library/
├── _components/
│   ├── components/      # 라이브러리 컴포넌트
│   │   ├── LibraryCard.tsx
│   │   ├── LibrarySection.tsx
│   │   └── VirtualizedLibrarySection.tsx
│   ├── hooks/           # 라이브러리 전용 훅
│   │   ├── useLibraryData.ts
│   │   ├── useLibraryInfiniteQuery.ts
│   │   └── useLibraryPrefetch.ts
│   └── constants/       # 캐시 정책
│       ├── cache-keys.ts
│       └── cache-policy.ts
└── _api/
    └── api.ts           # 라이브러리 API
```

**역할**: 무한 스크롤 미디어 라이브러리, 캐싱 최적화, 프리페칭

### 4.2. Infrastructure 레이어 가이드

#### 🗄️ **Supabase (통합된 데이터베이스 클라이언트)**
```
src/infrastructure/supabase/
├── client.ts            # 브라우저 클라이언트
├── server.ts            # 서버 클라이언트  
├── storage.ts           # 스토리지 관리
├── service.ts           # 서비스 키 클라이언트
└── middleware.ts        # 미들웨어
```

**역할**: 단일 Supabase 접점, 중복 제거된 클라이언트 관리

#### 🤖 **AI Services**
```
src/infrastructure/ai-services/
├── fal-ai.ts            # fal.ai API 통합
└── fal-webhook.ts       # 웹훅 처리
```

**역할**: 외부 AI 서비스 통합, API 추상화

### 4.3. 개발 시 주의사항

#### **Feature 모듈 개발 원칙**
1. **단일 책임**: 각 feature는 하나의 도메인만 담당
2. **독립성**: 다른 feature에 직접 의존하지 않음
3. **Colocation**: 관련 파일들을 가까이 배치
4. **일관된 구조**: 모든 feature가 동일한 폴더 구조 유지

#### 🔄 **Import 규칙**
```typescript
// 1. 외부 라이브러리
import { useState } from 'react'

// 2. Infrastructure (외부 서비스)
import { createClient } from '@/infrastructure/supabase/client'

// 3. Other Features (최소화)
import { useAuth } from '@/features/user-auth/_context/AuthContext'

// 4. Shared 자원
import { Button } from '@/shared/ui/Button'

// 5. Same Feature 내부 (상대 경로)
import { useSlotManager } from '../_hooks/useSlotManager'
```

#### 🚫 **금지사항**
- Features 간 직접적인 컴포넌트 import
- Infrastructure에서 Features로의 import
- Shared에서 Features로의 import
- God Component 생성 (500줄 초과 시 분할)

## 5. Eslint 와 타입에러 체크
- 수정할 때 먼저 타입에러 사전에 미리 방지를 해라. 
- type 관련 문서 미리 참고해라.
- Eslint 에러를 사전에 미리 방지를 해라.
- any 타입 사용 금지.
- Features 기반 구조에서는 각 모듈별 타입 정의 우선