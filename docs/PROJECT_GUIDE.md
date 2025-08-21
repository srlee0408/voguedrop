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

### 1.4. 코딩 스타일

- **들여쓰기**: 2칸(space)을 사용합니다.
- **따옴표**: `"`(큰따옴표) 사용을 권장합니다. (`prettier` 설정에 따름)
- **세미콜론**: 생략합니다. (`prettier` 설정에 따름)
- **Linter/Formatter**: `ESLint`와 `Prettier`를 사용하여 코드 스타일을 일관되게 유지합니다. 저장 시 자동으로 포맷팅되도록 설정하는 것을 권장합니다.

## 2. 사용할 컴포넌트/라이브러리

### 2.1. UI 컴포넌트

- **기반**: **shadcn/ui**
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

## 3. 구체적인 예시 코드

### 3.1. 완성된 컴포넌트 예시 (`Header.tsx`)

`useUser` 커스텀 훅으로 사용자 상태를 가져오고, 상태에 따라 UI를 조건부 렌더링하며, Supabase 클라이언트로 인증을 처리하는 예시입니다.

```tsx
// src/components/layout/header.tsx
"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useUser } from "@/hooks/use-user" // 커스텀 훅 사용
import { createClient } from "@/lib/supabase/client"

export function Header() {
  const { user, isLoading } = useUser()
  const supabase = createClient()

  const handleSignIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${location.origin}/auth/callback`,
      },
    })
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-black bg-opacity-50 backdrop-blur-md">
      <Link href="/" className="text-2xl font-bold text-white">
        VogueDrop
      </Link>
      <nav className="flex items-center space-x-4">
        {/* ... 중간 생략 ... */}
        {isLoading ? (
          <div className="w-20 h-10 bg-gray-700 rounded-md animate-pulse" />
        ) : user ? (
          <>
            <Link href="/my-page" className="text-white hover:text-gray-300">
              My Page
            </Link>
            <Button variant="outline" onClick={handleSignOut}>
              Sign Out
            </Button>
          </>
        ) : (
          <Button variant="default" onClick={handleSignIn}>
            Sign In with Google
          </Button>
        )}
      </nav>
    </header>
  )
}
```

### 3.2. API 호출 패턴 예시 (Supabase 클라이언트)

Supabase 클라이언트는 필요에 따라 클라이언트 컴포넌트와 서버 컴포넌트에서 각각 생성하여 사용합니다.

**클라이언트 컴포넌트에서 Supabase 사용:**

```typescript
// src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**서버 컴포넌트/API 라우트에서 Supabase 사용:**
(서버용 클라이언트는 `lib/supabase/server.ts` 에 유사한 패턴으로 존재할 것으로 예상됩니다.)

### 3.3. 상태 관리 패턴 예시 (`useUser` 훅)

React Query의 `useQuery`를 사용하여 사용자 정보를 가져오고, 전역적으로 사용할 수 있는 커스텀 훅 예시입니다. (실제 코드는 다를 수 있으나, 이런 패턴을 지향합니다.)

```typescript
// src/hooks/use-user.ts (가상 코드)
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

const fetchUser = async () => {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

export const useUser = () => {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ['user'],
    queryFn: fetchUser,
  });

  return { user, isLoading, error };
};
```

## 4. 명확한 구현 지시사항 (예시: 프로필 페이지)

### 4.1. 만들 기능

- 사용자의 프로필 정보(이름, 이메일, 프로필 사진)를 보여주는 '마이 페이지'를 구현합니다.

### 4.2. 파일 및 코드 위치

1.  **라우트 파일 생성**: `src/app/(home)/my-page/page.tsx`
2.  **UI 컴포넌트 생성**: `src/components/user/UserProfile.tsx`
3.  **API 로직**: Supabase를 사용하여 사용자 정보를 가져오는 로직은 `page.tsx` 내에서 직접 처리하거나, 재사용을 위해 `src/lib/api/user.ts` 같은 파일로 분리할 수 있습니다.

### 4.3. 예상 파일 구조

```
src/
└── app/
    └── (home)/
        └── my-page/
            └── page.tsx       // 마이 페이지 라우트
└── components/
    └── user/
        └── UserProfile.tsx  // 프로필 UI 컴포넌트
```

### 4.4. `UserProfile.tsx` 예시 코드

```tsx
// src/components/user/UserProfile.tsx
import Image from 'next/image';
import { User } from '@supabase/supabase-js';

interface UserProfileProps {
  user: User;
}

export function UserProfile({ user }: UserProfileProps) {
  return (
    <div className="p-8 bg-gray-900 rounded-lg shadow-lg text-white">
      <h2 className="text-2xl font-bold mb-4">My Profile</h2>
      {user.user_metadata.avatar_url && (
        <Image
          src={user.user_metadata.avatar_url}
          alt="Profile picture"
          width={80}
          height={80}
          className="rounded-full mb-4"
        />
      )}
      <p><strong>Name:</strong> {user.user_metadata.full_name}</p>
      <p><strong>Email:</strong> {user.email}</p>
    </div>
  );
}
```

### 4.5. `page.tsx` 예시 코드

```tsx
// src/app/(home)/my-page/page.tsx
import { createClient } from '@/lib/supabase/server'; // 서버 클라이언트 사용
import { UserProfile } from '@/components/user/UserProfile';
import { redirect } from 'next/navigation';

export default async function MyPage() {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <main className="container mx-auto pt-24">
      <UserProfile user={user} />
    </main>
  );
}
```
