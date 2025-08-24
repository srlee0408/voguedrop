import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/shared/lib/supabase/server';

interface RouteParams {
  params: Promise<{
    jobId: string;
  }>;
}

export async function GET(
  request: NextRequest,
  props: RouteParams
) {
  try {
    const params = await props.params;
    const { jobId } = params;

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID가 필요합니다.' },
        { status: 400 }
      );
    }

    // Supabase에서 job 상태 조회
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('video_generations')
      .select('id, job_id, status, created_at, updated_at, output_video_url, input_image_url, is_favorite, error_message, model_type')
      .eq('job_id', jobId)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: '작업을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 클라이언트에 반환할 데이터 구성 (민감한 정보 제외)
    const response = {
      id: data.id,
      jobId: data.job_id,
      status: data.status,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      modelType: data.model_type,
      progress: getProgressPercentage(data.status),
      result: data.status === 'completed' ? {
        videoUrl: data.output_video_url,
        thumbnailUrl: data.input_image_url,
        isFavorite: data.is_favorite || false
      } : null,
      error: data.status === 'failed' ? data.error_message : null
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('GET job status error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * 상태에 따른 진행률 계산
 */
function getProgressPercentage(status: string): number {
  switch (status) {
    case 'pending':
      return 0;
    case 'processing':
      return 50;
    case 'completed':
      return 100;
    case 'failed':
      return 0;
    default:
      return 0;
  }
}