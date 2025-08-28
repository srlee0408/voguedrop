import { NextRequest, NextResponse } from 'next/server';
import { toggleVideoFavorite } from '@/shared/lib/db/video-generations';
import { createClient } from '@/infrastructure/supabase/server';

export async function PATCH(request: NextRequest) {
  try {
    // 인증된 Supabase 클라이언트 생성
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Login required.' },
        { status: 401 }
      );
    }

    const { videoId, isFavorite } = await request.json();

    if (!videoId || typeof isFavorite !== 'boolean') {
      return NextResponse.json(
        { error: 'videoId and isFavorite are required' },
        { status: 400 }
      );
    }

    // 인증된 supabase 클라이언트와 함께 호출
    const updatedVideo = await toggleVideoFavorite(videoId, isFavorite, supabase);

    return NextResponse.json({ 
      success: true, 
      videoId: updatedVideo.id,
      isFavorite: updatedVideo.is_favorite
    });
  } catch (error) {
    console.error('Error toggling favorite:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to toggle favorite';
    return NextResponse.json(
      { 
        error: errorMessage,
        details: error instanceof Error ? error.stack : undefined 
      },
      { status: 500 }
    );
  }
}