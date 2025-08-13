import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
    
    // 최근 30개 완료된 사운드 생성 기록 조회
    // prompt 등 민감한 정보는 제외하고 필수 정보만 반환
    const { data: soundHistory, error } = await supabase
      .from('sound_generations')
      .select('id, title, output_audio_url, duration_seconds, created_at')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .not('output_audio_url', 'is', null)
      .order('created_at', { ascending: false })
      .limit(30);
    
    if (error) {
      console.error('Failed to fetch sound history:', error);
      return NextResponse.json(
        { error: '사운드 기록을 불러오는데 실패했습니다.' },
        { status: 500 }
      );
    }
    
    // 응답 형식 변환 (SoundLibraryModal에서 사용하는 형식으로)
    const formattedHistory = (soundHistory || []).map(sound => ({
      id: `history-${sound.id}`,
      name: sound.title || `AI Sound ${sound.id}`,
      url: sound.output_audio_url,
      duration: Number(sound.duration_seconds),
      createdAt: sound.created_at
    }));
    
    return NextResponse.json({
      success: true,
      sounds: formattedHistory
    });
    
  } catch (error) {
    console.error('Error fetching sound history:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error 
          ? error.message 
          : '서버 오류가 발생했습니다.'
      },
      { status: 500 }
    );
  }
}