import { NextResponse } from 'next/server';
import { createClient } from '@/shared/lib/supabase/server';

/**
 * 활성 비디오 생성 작업 목록 조회 API
 * - 사용자별 pending/processing 상태의 작업을 반환
 * - 클라이언트 복원 로직에서 사용
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    const { data } = await supabase
      .from('video_generations')
      .select('id, job_id, status, created_at, input_image_url, model_type')
      .eq('user_id', user.id)
      .in('status', ['pending', 'processing'])
      .order('created_at', { ascending: false });

    return NextResponse.json({
      jobs: (data || []).map(j => ({
        id: j.id,
        jobId: j.job_id,
        status: j.status,
        createdAt: j.created_at,
        imageUrl: j.input_image_url,
        modelType: j.model_type
      }))
    }, {
      headers: {
        // 캐싱 방지: 진행중 상태는 항상 최신이 필요
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      }
    });
  } catch {
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}


