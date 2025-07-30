import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getOrCreateSessionId } from '@/lib/utils/session.server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // 세션 ID 가져오기 (익명 사용자 지원)
    const sessionId = await getOrCreateSessionId();

    // video_generations 테이블에서 완료된 영상만 조회
    const { data, error, count } = await supabase
      .from('video_generations')
      .select('*', { count: 'exact' })
      .eq('user_id', sessionId)
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

    // 응답 데이터 포맷팅
    const formattedVideos = (data || []).map(video => ({
      id: video.id,
      videoUrl: video.output_video_url,
      thumbnail: video.input_image_url,
      createdAt: video.created_at,
      effects: video.selected_effects || [],
      sourceImageUrl: video.input_image_url,
      prompt: video.prompt,
      modelType: video.model_type
    }));

    return NextResponse.json({
      videos: formattedVideos,
      total: count || 0,
      hasMore: (offset + limit) < (count || 0),
      sessionId
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}