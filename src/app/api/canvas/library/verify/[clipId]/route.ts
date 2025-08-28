import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/infrastructure/supabase/server';

interface RouteParams {
  params: Promise<{
    clipId: string;
  }>;
}

/**
 * 클립이 데이터베이스에 실제로 존재하는지 검증하는 API
 */
export async function GET(
  request: NextRequest,
  props: RouteParams
) {
  try {
    const params = await props.params;
    const { clipId } = params;

    if (!clipId) {
      return NextResponse.json(
        { error: 'Clip ID가 필요합니다.' },
        { status: 400 }
      );
    }

    // 인증 확인
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 클립의 완전한 정보 조회 (사용자의 클립만)
    const { data, error } = await supabase
      .from('video_generations')
      .select('id, status, output_video_url, input_image_url, created_at, is_favorite, model_type')
      .eq('id', clipId)
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .single();

    if (error || !data || !data.output_video_url) {
      return NextResponse.json({
        exists: false,
        clipId,
        error: error?.message
      });
    }

    // 완전한 클립 데이터 반환 (검증용)
    return NextResponse.json({
      exists: true,
      clipData: {
        id: data.id,
        videoUrl: data.output_video_url,
        thumbnailUrl: data.input_image_url,
        createdAt: data.created_at,
        isFavorite: data.is_favorite || false,
        modelType: data.model_type || 'hailo'
      }
    });

  } catch {
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.', exists: false },
      { status: 500 }
    );
  }
}