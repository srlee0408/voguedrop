# Voguedrop 프로젝트 가이드

이 문서는 Voguedrop 프로젝트의 원활한 협업을 위한 코드 컨벤션, 아키텍처, 주요 라이브러리 사용법을 정의합니다.

## 1. 코드 컨벤션

### 1.1. 네이밍 규칙

- **컴포넌트:** `PascalCase`를 사용합니다. (예: `MyComponent`, `Header`)
- **함수/변수:** `camelCase`를 사용합니다. (예: `getUser`, `userName`)
- **타입/인터페이스:** `PascalCase`를 사용하며, 필요한 경우 `T` 접두사를 사용할 수 있습니다. (예: `User`, `TButtonProps`)
- **파일 (컴포넌트):** `kebab-case` 또는 `PascalCase`를 사용하되, 일관성을 유지합니다. 현재 프로젝트는 `PascalCase`를 주로 사용합니다. (예: `HeroSection.tsx`, `Footer.tsx`)
- **파일 (일반):** `kebab-case`를 사용합니다. (예: `user-api.ts`)

### 1.2. 파일 구조 및 폴더 명명

- **`src/app`**: Next.js의 App Router 기반 라우팅 구조를 따릅니다.
  - `(group)`: 라우트 그룹을 사용하여 폴더를 URL 경로에서 제외합니다. (예: `(home)`)
  - `_components`: 특정 라우트에서만 사용되는 내부 컴포넌트를 배치합니다.
- **`src/components`**: 전역적으로 사용되는 공통 컴포넌트.
  - `ui`: `shadcn/ui`를 통해 관리되는 기본 UI 컴포넌트 (Button, Input 등).
  - `layout`: Header, Footer 등 레이아웃 관련 컴포넌트.
- **`src/lib`**: 비즈니스 로직, API 클라이언트, 유틸리티 함수 등.
  - `supabase`: Supabase 클라이언트 및 관련 로직.
  - `utils`: `cn` 함수 등 전역 유틸리티.
- **`src/hooks`**: 재사용 가능한 커스텀 훅. (예: `useUser.ts`)
- **`src/contexts`**: React Context API 관련 파일.
- **`src/types`**: 전역적으로 사용되는 TypeScript 타입 정의.

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