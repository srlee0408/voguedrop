import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/shared/lib/api/auth';

/**
 * 즐겨찾기 클립 전용 API 엔드포인트
 * Library Modal의 즐겨찾기 섹션을 위한 최적화된 API
 */
export async function GET(request: NextRequest) {
  try {
    // 사용자 인증 확인
    const { user, error: authError } = await requireAuth(request);
    if (authError) {
      return authError;
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Login required.' },
        { status: 401 }
      );
    }

    // URL 파라미터
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const cursor = searchParams.get('cursor');

    // 기존 Library API를 즐겨찾기 타입으로 호출
    const baseUrl = new URL('/api/canvas/library', request.url);
    baseUrl.searchParams.set('type', 'favorites');
    baseUrl.searchParams.set('limit', limit.toString());
    if (cursor) {
      baseUrl.searchParams.set('cursor', cursor);
    }

    // 내부 API 호출
    const response = await fetch(baseUrl.toString(), {
      headers: {
        'Authorization': request.headers.get('Authorization') || '',
        'Cookie': request.headers.get('Cookie') || ''
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch favorites');
    }

    const data = await response.json();

    // 즐겨찾기 전용 응답 형태로 변환 (캐시 금지로 즉시 일관성 보장)
    const headers = new Headers({
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    return new NextResponse(JSON.stringify({
      favorites: data.clips || [],
      pagination: data.pagination,
      totalCount: data.totalCount,
      counts: {
        favorites: data.counts?.clips || 0
      }
    }), { status: 200, headers });

  } catch (error) {
    console.error('Favorites API error:', error);
    return NextResponse.json(
      { error: '즐겨찾기 목록을 불러오는데 실패했습니다.' },
      { status: 500 }
    );
  }
}