import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth';

/**
 * All clips API endpoint (including favorites)
 * Optimized API for Library Modal's Clips section that shows all clips
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

    // 기존 Library API를 일반 타입으로 호출
    const baseUrl = new URL('/api/canvas/library', request.url);
    baseUrl.searchParams.set('type', 'regular');
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
      throw new Error('Failed to fetch regular clips');
    }

    const data = await response.json();

    // 일반 클립 전용 응답 형태로 변환
    return NextResponse.json({
      regular: data.clips || [],
      clips: data.clips || [], // backward compatibility
      pagination: data.pagination,
      totalCount: data.totalCount,
      counts: {
        regular: data.counts?.clips || 0,
        clips: data.counts?.clips || 0 // backward compatibility
      }
    });

  } catch (error) {
    console.error('Regular clips API error:', error);
    return NextResponse.json(
      { error: 'Failed to load clips list.' },
      { status: 500 }
    );
  }
}