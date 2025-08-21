# 기능: 데이터 페칭 및 캐싱 전략

## 1. 개요
VogueDrop은 빠른 페이지 로딩과 반응성을 제공하기 위해 다층 캐싱(Multi-layer Caching) 전략을 사용합니다. 이를 통해 데이터베이스 부하를 최소화하고 사용자 경험을 극대화합니다.

## 2. 핵심 파일
- **서버/API 캐싱**: `src/lib/api/gallery.ts` (`unstable_cache` 사용)
- **클라이언트 캐싱**: `src/lib/hooks/useGalleryData.ts` (`@tanstack/react-query` 사용)
- **페이지 레벨 캐싱 (ISR)**: `src/app/gallery/page.tsx`, `src/app/page.tsx`
- **캐시 무효화 API**: `src/app/api/revalidate/route.ts`
- **상세 구현 계획**: `docs/task/task_gallery_caching_optimization.md`

## 3. 3-Layer 캐싱 아키텍처

```mermaid
graph TD
    subgraph "User Request"
        U[Browser]
    end

    U --> L1[Layer 1: ISR @ Vercel Edge]
    L1 -- "Cache Hit (Static HTML)" --> U
    L1 -- "Cache Miss / Stale" --> L2[Layer 2: unstable_cache @ Server]
    
    L2 -- "Cache Hit (Data)" --> R[Render Page]
    L2 -- "Cache Miss" --> L3[Layer 3: Supabase DB]
    
    L3 --> L2
    R --> L1

    U -- "Client-side Navigation" --> RQ[React Query Cache]
    RQ -- "Cache Hit" --> UI[Instant UI Update]
    RQ -- "Cache Miss / Stale" --> API[fetch('/api/...')]
    API --> L2
```

### Layer 1: Incremental Static Regeneration (ISR)
- **역할**: 페이지 전체를 정적으로 생성하고 주기적으로 업데이트합니다.
- **구현**: 페이지 파일(`page.tsx`)에 `export const revalidate = 60;`를 추가합니다.
- **동작**: 사용자는 Vercel의 엣지 네트워크에 캐시된 정적 HTML을 즉시 받습니다. 60초가 지난 후 첫 요청이 들어오면, Vercel은 캐시된 페이지를 보여주는 동시에 백그라운드에서 페이지를 새로 생성하여 다음 요청부터는 새 페이지가 제공됩니다.
- **장점**: 매우 빠른 초기 로딩 속도(TTFB)를 보장합니다.

### Layer 2: Data Cache (`unstable_cache`)
- **역할**: 데이터베이스 쿼리와 같은 비싼 함수 호출 결과를 서버 내에서 캐싱합니다.
- **구현**: `next/cache`의 `unstable_cache` 함수로 데이터 조회 함수를 감쌉니다.
- **동작**: `getGalleryItems`가 호출되면, `unstable_cache`는 먼저 캐시 저장소에 `['gallery-items']`라는 키로 저장된 데이터가 있는지 확인합니다. 있으면 DB 쿼리 없이 즉시 반환하고, 없으면 실제 함수를 실행하고 결과를 캐시에 저장한 후 반환합니다.
- **태그 기반 무효화**: `tags: ['gallery']` 옵션을 통해 특정 데이터 그룹을 한 번에 무효화할 수 있습니다. 예를 들어, 관리자가 새 갤러리 아이템을 추가하면 `revalidateTag('gallery')`를 호출하여 이 캐시를 삭제할 수 있습니다.

### Layer 3: React Query (클라이언트 캐시)
- **역할**: 클라이언트(브라우저) 메모리에 데이터를 캐싱하여 SPA와 같은 부드러운 사용자 경험을 제공합니다.
- **구현**: `useQuery` 훅을 사용하여 데이터를 조회합니다.
- **동작**:
  1.  **초기 데이터(Initial Data)**: 서버에서 렌더링된 데이터를 `initialData`로 받아 첫 렌더링 시에는 API 요청을 보내지 않습니다.
  2.  **`staleTime`**: 데이터가 `staleTime`(예: 60초) 동안은 "신선한(fresh)" 것으로 간주되어, 이 시간 내에 컴포넌트가 다시 렌더링되어도 API 요청을 보내지 않습니다.
  3.  **`gcTime` (Garbage Collection)**: 데이터가 비활성화된 후 `gcTime`(예: 5분)이 지나면 캐시에서 제거됩니다.
  4.  **백그라운드 리프레시**: `staleTime`이 지난 후에는 캐시된 데이터를 먼저 보여주고, 백그라운드에서 조용히 새로운 데이터를 가져와 UI를 업데이트합니다.

## 4. 캐시 무효화 (Cache Invalidation)
- **`POST /api/revalidate`**: 이 API는 `revalidateTag(tag)`를 호출하여 `unstable_cache`로 생성된 서버 데이터 캐시와, 해당 태그와 관련된 페이지들의 ISR 캐시를 모두 무효화합니다.
- **`queryClient.invalidateQueries`**: React Query의 이 함수는 클라이언트 캐시를 무효화하고, 다음 번에 해당 데이터가 필요할 때 강제로 새로운 API 요청을 보내도록 합니다.

이러한 다층 캐싱 전략을 통해 VogueDrop은 데이터의 신선도를 유지하면서도 서버 부하를 줄이고 사용자에게 최고의 성능을 제공합니다.
