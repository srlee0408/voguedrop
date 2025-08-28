import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/infrastructure/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // 인증된 Supabase 클라이언트 생성
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    // video_generations 테이블에서 완료된 영상만 조회 (민감한 정보 제외)
    const { data, error, count } = await supabase
      .from('video_generations')
      .select('id, job_id, input_image_url, output_video_url, created_at, is_favorite', { count: 'exact' })
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('History fetch error:', error);
      return NextResponse.json(
        { error: '영상 기록을 불러오는데 실패했습니다.' },
        { status: 500 }
      );
    }

    // 응답 데이터 포맷팅 (민감한 정보 제외)
    const formattedVideos = (data || []).map(video => ({
      id: video.id, // UUID를 ID로 사용하여 즐겨찾기 일관성 유지
      videoUrl: video.output_video_url,
      thumbnail: video.input_image_url,
      createdAt: video.created_at,
      isFavorite: video.is_favorite || false
    }));

    return NextResponse.json({
      videos: formattedVideos,
      total: count || 0,
      hasMore: (offset + limit) < (count || 0)
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}