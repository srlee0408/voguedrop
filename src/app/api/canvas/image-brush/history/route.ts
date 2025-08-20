import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/shared/lib/supabase/service';
import { requireAuth } from '@/lib/api/auth';
import type { ImageBrushHistoryItem } from '@/shared/types/image-brush';

/**
 * Image Brush History API Route
 * 서버 사이드에서만 Service Role을 통해 히스토리 데이터 접근
 * RLS가 비활성화되어 있으므로 반드시 서버에서만 호출해야 함
 */

// GET: 사용자의 Image Brush 히스토리 조회
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // 1. 사용자 인증 확인 (보안 유틸리티 사용)
    const { user, error: authError } = await requireAuth(request);
    if (authError) {
      return authError;
    }
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required.' },
        { status: 401 }
      );
    }

    // 2. Query parameters 파싱
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // 3. Service Client로 데이터베이스 접근 (user_id 조건 포함)
    const serviceSupabase = createServiceClient();
    
    // 4. 사용자의 히스토리 조회 (user_id 조건으로 보안 강화)
    const { data: history, error: dbError, count } = await serviceSupabase
      .from('image_brush_history')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id) // 보안: 사용자 데이터만 조회
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { error: 'Failed to fetch history.' },
        { status: 500 }
      );
    }

    // 5. 응답 형식 변환
    const items: ImageBrushHistoryItem[] = (history || []).map(item => ({
      id: item.id,
      original: item.original_image || '',
      brushed: item.result_url,
      prompt: item.prompt,
      timestamp: new Date(item.created_at).getTime(),
      mode: item.mode as 'flux' | 'i2i'
    }));

    return NextResponse.json({
      items,
      total: count || 0,
      limit,
      offset
    });

  } catch (error) {
    console.error('Image brush history API error:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching history.' },
      { status: 500 }
    );
  }
}

// DELETE: 특정 히스토리 항목 삭제
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    // 1. 사용자 인증 확인 (보안 유틸리티 사용)
    const { user, error: authError } = await requireAuth(request);
    if (authError) {
      return authError;
    }
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required.' },
        { status: 401 }
      );
    }

    // 2. 요청 본문에서 ID 추출
    const { id } = await request.json();
    
    if (!id) {
      return NextResponse.json(
        { error: 'Item ID is required for deletion.' },
        { status: 400 }
      );
    }

    // 3. Service Client로 데이터베이스 접근
    const serviceSupabase = createServiceClient();

    // 4. 먼저 해당 항목이 사용자 소유인지 확인 (소유권 검증)
    const { data: item, error: checkError } = await serviceSupabase
      .from('image_brush_history')
      .select('user_id, result_url')
      .eq('id', id)
      .eq('user_id', user.id) // 보안: 처음부터 user_id 조건 포함
      .single();

    if (checkError || !item) {
      return NextResponse.json(
        { error: 'Item not found or permission denied.' },
        { status: 404 }
      );
    }

    // 5. Storage에서 이미지 파일 삭제 (선택사항)
    if (item.result_url) {
      try {
        // result_url에서 storage path 추출
        const url = new URL(item.result_url);
        const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/user-uploads\/(.*)/);
        if (pathMatch && pathMatch[1]) {
          await serviceSupabase.storage
            .from('user-uploads')
            .remove([pathMatch[1]]);
        }
      } catch (storageError) {
        console.warn('Failed to delete storage file:', storageError);
        // Storage 삭제 실패는 무시하고 계속 진행
      }
    }

    // 6. 데이터베이스에서 항목 삭제 (소유권 검증 포함)
    const { error: deleteError } = await serviceSupabase
      .from('image_brush_history')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id); // 보안: user_id 조건으로 소유권 확인

    if (deleteError) {
      console.error('Delete error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete item.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'History item deleted successfully.'
    });

  } catch (error) {
    console.error('Image brush history delete error:', error);
    return NextResponse.json(
      { error: 'An error occurred during deletion.' },
      { status: 500 }
    );
  }
}