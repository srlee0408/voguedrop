/**
 * Library 모달 전용 클라이언트 API 서비스
 * - 인터랙션 요청은 cache: 'no-store'
 * - 프리페치 요청(prefetch=true)은 CDN 캐시 허용
 */

export type LibraryType = 'all' | 'clips' | 'projects' | 'uploads' | 'favorites' | 'regular';

interface FetchPageParams {
  type: LibraryType;
  limit: number;
  cursor?: string;
  prefetch?: boolean;
}

export async function fetchLibraryPage({ type, limit, cursor, prefetch }: FetchPageParams) {
  const params = new URLSearchParams({ type, limit: String(limit) });
  if (cursor) params.set('cursor', cursor);
  if (prefetch) params.set('prefetch', 'true');

  const response = await fetch(`/api/canvas/library?${params.toString()}`, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': prefetch ? 'public, s-maxage=300, stale-while-revalidate=600' : 'no-store',
    },
    cache: prefetch ? 'force-cache' : 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch library page: ${response.statusText}`);
  }
  return response.json();
}

export async function fetchLibraryCounts() {
  const response = await fetch('/api/canvas/library?counts_only=true', {
    headers: { 'Cache-Control': 'no-store' },
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('Failed to fetch library counts');
  return response.json();
}

interface FetchFavoritesParams {
  limit: number;
  cursor?: string;
}

export async function fetchFavoritesPage({ limit, cursor }: FetchFavoritesParams) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set('cursor', cursor);
  const response = await fetch(`/api/canvas/library/favorites?${params.toString()}`, {
    headers: { 'Cache-Control': 'no-store' },
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`Failed to fetch favorites: ${response.status}`);
  return response.json();
}


