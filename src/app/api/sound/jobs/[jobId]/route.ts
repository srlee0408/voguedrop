import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/shared/lib/supabase/server';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ jobId: string }> }
) {
  try {
    const params = await context.params;
    const { jobId } = params;
    
    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID가 필요합니다.' },
        { status: 400 }
      );
    }
    
    // Supabase 클라이언트 생성
    const supabase = await createClient();
    
    // 인증 확인
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }
    
    // DB에서 job 정보 조회
    const { data: soundGeneration, error } = await supabase
      .from('sound_generations')
      .select('*')
      .eq('job_id', jobId)
      .eq('user_id', user.id)
      .single();
    
    if (error || !soundGeneration) {
      console.error('Failed to fetch sound generation:', error);
      return NextResponse.json(
        { error: '사운드 생성 정보를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    
    // 응답 구조화
    const response = {
      jobId: soundGeneration.job_id,
      status: soundGeneration.status,
      createdAt: soundGeneration.created_at,
      result: soundGeneration.status === 'completed' ? {
        audioUrl: soundGeneration.output_audio_url,
        title: soundGeneration.title,
        prompt: soundGeneration.prompt,
        duration: soundGeneration.duration_seconds
      } : undefined,
      error: soundGeneration.error_message || undefined
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Error fetching sound generation status:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error 
          ? error.message 
          : '상태 확인 중 오류가 발생했습니다.'
      },
      { status: 500 }
    );
  }
}