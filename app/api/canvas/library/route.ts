import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    // URL 파라미터 가져오기
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');

    // 민감한 정보를 제외하고 필요한 필드만 선택
    const { data: videos, error } = await supabase
      .from('video_generations')
      .select(`
        id,
        job_id,
        status,
        input_image_url,
        output_video_url,
        created_at,
        is_favorite,
        selected_effects
      `)
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .not('output_video_url', 'is', null)
      .order('is_favorite', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      // Error fetching library videos
      return NextResponse.json(
        { error: '비디오 목록을 불러오는데 실패했습니다.' },
        { status: 500 }
      );
    }

    // selected_effects에서 name만 추출하여 반환
    const sanitizedVideos = (videos || []).map(video => ({
      id: video.id,
      job_id: video.job_id,
      status: video.status,
      input_image_url: video.input_image_url,
      output_video_url: video.output_video_url,
      created_at: video.created_at,
      is_favorite: video.is_favorite,
      selected_effects: video.selected_effects?.map((effect: { id: number; name: string }) => ({
        id: effect.id,
        name: effect.name
      })) || []
    }));

    return NextResponse.json({
      videos: sanitizedVideos,
      count: sanitizedVideos.length
    });

  } catch {
    // Library API error
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}