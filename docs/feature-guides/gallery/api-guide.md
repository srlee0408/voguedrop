# Gallery API & Code Guide

## 1. 개요
갤러리 기능은 사용자가 생성했거나 다른 사용자들이 공개한 AI 영상들을 모아서 보여주는 페이지입니다. 카테고리별 필터링 및 무한 스크롤을 지원하며, 성능 최적화를 위해 다층 캐싱 전략을 사용합니다.

## 2. 핵심 워크플로우
```mermaid
graph TD
    subgraph "Server-Side (Build Time / Revalidation)"
        A[1. getGalleryItems()] --> B[2. unstable_cache]
        B -- "Cache Miss" --> C[3. Supabase Query]
        B -- "Cache Hit" --> D[4. Return Cached Data]
        C --> D
    end
    
    subgraph "Client-Side"
        E[5. User visits /gallery] --> F[6. Receives static page from ISR]
        F --> G[7. React Query hydrates with initialData]
        G --> H{8. User scrolls / filters}
        H --> I[9. fetch('/api/gallery/items')]
        I --> J[10. React Query updates UI]
    end
```

## 3. 주요 파일 및 코드 위치

### 프론트엔드 컴포넌트
- **갤러리 페이지 (서버)**: `src/app/gallery/page.tsx`
- **갤러리 페이지 (클라이언트)**: `src/app/gallery/_components/GalleryPageClient.tsx`
- **홈페이지 내 갤러리 섹션**: `src/app/(home)/_components/GallerySection.tsx`
- **개별 갤러리 아이템 카드**: `src/components/gallery/GalleryItems.tsx`

### 상태 관리 및 데이터 페칭
- **React Query Provider**: `src/lib/providers/QueryProvider.tsx`
- **React Query 커스텀 훅**: `src/lib/hooks/useGalleryData.ts`

### 핵심 로직 (API 및 캐싱)
- **데이터 조회 및 캐싱**: `src/lib/api/gallery.ts`
  - `unstable_cache`를 사용하여 Supabase DB 조회를 캐싱합니다.
- **캐시 무효화**: `src/app/api/revalidate/route.ts`
  - 태그 기반(`revalidateTag`)으로 특정 캐시를 무효화합니다.

### 백엔드 (API Routes)
- **갤러리 아이템 조회**: `src/app/api/gallery/items/route.ts`
- **카테고리 조회**: `src/app/api/gallery/categories/route.ts`

### 데이터베이스
- **관련 테이블**: `effect_templates`, `categories`, `media_assets`
- **최적화 문서**: `docs/task/task_gallery_caching_optimization.md`

## 4. 주요 API 엔드포인트

- **`GET /api/gallery/items`**:
  - **역할**: 클라이언트 사이드에서 갤러리 아이템 목록을 비동기적으로 가져올 때 사용됩니다. 내부적으로는 캐시된 `getGalleryItems` 함수를 호출합니다.
  - **응답**: `EffectTemplateWithMedia[]` 타입의 아이템 배열
- **`GET /api/gallery/categories`**:
  - **역할**: 갤러리 필터링에 사용될 카테고리 목록을 가져옵니다.
  - **응답**: `Category[]` 타입의 카테고리 배열
- **`POST /api/revalidate`**:
  - **역할**: 관리자가 새로운 콘텐츠를 추가했을 때, 서버 캐시를 수동으로 무효화합니다.
  - **요청**: `{ tag: 'gallery' | 'categories', secret: '...' }`
  - **응답**: `{ revalidated: true }`

## 5. 시나리오 예시: "갤러리 아이템에 '좋아요' 버튼 추가"
AI 에이전트가 이 작업을 수행해야 할 경우, 다음 단계를 따릅니다.

1.  **기능 분석**: '좋아요'는 사용자 상호작용이므로 클라이언트 컴포넌트에서 처리해야 합니다. 데이터는 DB에 저장되어야 합니다.
2.  **UI 위치 파악**: 개별 갤러리 아이템에 버튼이 추가되어야 합니다.
    - **참고 파일**: `src/components/gallery/GalleryItems.tsx`의 카드 컴포넌트 내부를 수정합니다.
3.  **DB 스키마 변경**: '좋아요' 수를 저장할 컬럼이 필요합니다. `effect_templates` 테이블에 `likes_count INT DEFAULT 0` 같은 컬럼을 추가하는 마이그레이션 파일을 생성합니다.
    - **참고**: `supabase/migrations/` 폴더 구조
4.  **API 엔드포인트 생성**: '좋아요' 클릭을 처리할 API가 필요합니다.
    - **파일 생성**: `src/app/api/gallery/like/route.ts`
    - **로직**: 요청받은 `item_id`에 해당하는 레코드의 `likes_count`를 1 증가시킵니다.
    - **캐시 무효화**: '좋아요' 수가 변경되었으므로, 관련 캐시를 무효화해야 합니다. `revalidateTag('gallery')`를 호출하여 갤러리 목록이 다음 요청 시 갱신되도록 합니다.
5.  **클라이언트 로직 구현**:
    - **참고 파일**: `src/components/gallery/GalleryItems.tsx`
    - '좋아요' 버튼에 `onClick` 핸들러를 추가합니다.
    - 핸들러는 `fetch('/api/gallery/like', { method: 'POST', body: JSON.stringify({ itemId }) })`를 호출합니다.
    - **React Query 연동**: `useMutation` 훅을 사용하여 API를 호출하고, 성공 시 `queryClient.invalidateQueries(['gallery', 'items'])`를 호출하여 UI를 즉시 또는 다음 조회 시 업데이트합니다.
