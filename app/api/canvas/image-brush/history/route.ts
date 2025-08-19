import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ImageBrushHistoryItem } from '@/types/image-brush';

/**
 * Image Brush History API Route
 * 서버 사이드에서만 Service Role을 통해 히스토리 데이터 접근
 * RLS가 비활성화되어 있으므로 반드시 서버에서만 호출해야 함
 */

// GET: 사용자의 Image Brush 히스토리 조회
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // 1. 사용자 인증 확인
    const supabaseAuth = await createClient();
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required.' },
        { status: 401 }
      );
    }

    // 2. Query parameters 파싱
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // 3. Service Role로 데이터베이스 접근
    // 주의: 이 부분은 서버 사이드에서만 실행되어야 함
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseServiceKey) {
      console.error('SUPABASE_SERVICE_KEY not configured');
      return NextResponse.json(
        { error: 'Server configuration error.' },
        { status: 500 }
      );
    }

    const { createClient: createServiceClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseService = createServiceClient(supabaseUrl, supabaseServiceKey);

    // 4. 사용자의 히스토리 조회 (RLS 비활성화 상태에서 Service Role 사용)
    const { data: history, error: dbError, count } = await supabaseService
      .from('image_brush_history')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
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
    // 1. 사용자 인증 확인
    const supabaseAuth = await createClient();
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    
    if (authError || !user) {
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

    // 3. Service Role로 데이터베이스 접근
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseServiceKey) {
      console.error('SUPABASE_SERVICE_KEY not configured');
      return NextResponse.json(
        { error: 'Server configuration error.' },
        { status: 500 }
      );
    }

    const { createClient: createServiceClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseService = createServiceClient(supabaseUrl, supabaseServiceKey);

    // 4. 먼저 해당 항목이 사용자 소유인지 확인
    const { data: item, error: checkError } = await supabaseService
      .from('image_brush_history')
      .select('user_id, result_url')
      .eq('id', id)
      .single();

    if (checkError || !item) {
      return NextResponse.json(
        { error: 'Item not found.' },
        { status: 404 }
      );
    }

    if (item.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Permission denied.' },
        { status: 403 }
      );
    }

    // 5. Storage에서 이미지 파일 삭제 (선택사항)
    if (item.result_url) {
      try {
        // result_url에서 storage path 추출
        const url = new URL(item.result_url);
        const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/user-uploads\/(.*)/);
        if (pathMatch && pathMatch[1]) {
          await supabaseService.storage
            .from('user-uploads')
            .remove([pathMatch[1]]);
        }
      } catch (storageError) {
        console.warn('Failed to delete storage file:', storageError);
        // Storage 삭제 실패는 무시하고 계속 진행
      }
    }

    // 6. 데이터베이스에서 항목 삭제
    const { error: deleteError } = await supabaseService
      .from('image_brush_history')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id); // 추가 보안을 위해 user_id도 확인

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