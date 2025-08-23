import { NextResponse } from 'next/server';
import { createClient } from '@/shared/lib/supabase/server';

export async function GET() {
  try {
    // Supabase 클라이언트 생성 및 인증 확인
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    // 즐겨찾기된 비디오의 id(UUID)만 조회
    const { data: videos, error } = await supabase
      .from('video_generations')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_favorite', true)
      .eq('status', 'completed')
      .not('id', 'is', null);

    if (error) {
      console.error('Favorites fetch error:', error);
      return NextResponse.json(
        { error: '즐겨찾기 목록을 불러오는데 실패했습니다.' },
        { status: 500 }
      );
    }

    // UUID 배열만 반환
    const favoriteIds = (videos || [])
      .map(v => v.id)
      .filter(Boolean);

    return NextResponse.json({
      favoriteIds,
      total: favoriteIds.length
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}