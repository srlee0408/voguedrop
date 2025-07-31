import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{
    jobId: string;
  }>;
}

/**
 * fal.ai API를 직접 폴링하여 상태를 확인하는 엔드포인트
 * webhook이 실패하는 경우의 백업 방안
 */
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

    // Supabase에서 job 정보 조회
    const supabase = await createClient();
    
    const { data: job, error } = await supabase
      .from('video_generations')
      .select('*')
      .eq('job_id', jobId)
      .single();

    if (error || !job) {
      return NextResponse.json(
        { error: '작업을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 이미 완료되었거나 실패한 경우 그대로 반환
    if (job.status === 'completed' || job.status === 'failed') {
      return NextResponse.json({
        jobId: job.job_id,
        status: job.status,
        modelType: job.model_type,
        result: job.status === 'completed' ? {
          videoUrl: job.output_video_url,
          thumbnailUrl: job.input_image_url
        } : null,
        error: job.error_message
      });
    }

    // fal_request_id가 있는 경우 fal.ai API 상태 확인
    if (job.fal_request_id) {
      try {
        const statusUrl = `https://queue.fal.run/fal-ai/minimax/requests/${job.fal_request_id}/status`;
        
        const response = await fetch(statusUrl, {
          headers: {
            'Authorization': `Key ${process.env.FAL_API_KEY}`
          }
        });

        if (response.ok) {
          const statusData = await response.json();
          console.log('fal.ai status:', statusData);

          // 완료된 경우
          if (statusData.status === 'COMPLETED' && statusData.response_url) {
            // 결과 가져오기
            const resultResponse = await fetch(statusData.response_url, {
              headers: {
                'Authorization': `Key ${process.env.FAL_API_KEY}`
              }
            });

            if (resultResponse.ok) {
              const resultData = await resultResponse.json();
              
              if (resultData.video?.url) {
                // DB 업데이트
                await supabase
                  .from('video_generations')
                  .update({
                    status: 'completed',
                    output_video_url: resultData.video.url,
                    updated_at: new Date().toISOString()
                  })
                  .eq('job_id', jobId);

                return NextResponse.json({
                  jobId: job.job_id,
                  status: 'completed',
                  modelType: job.model_type,
                  result: {
                    videoUrl: resultData.video.url,
                    thumbnailUrl: job.input_image_url
                  }
                });
              }
            }
          } else if (statusData.status === 'FAILED') {
            // 실패 처리
            await supabase
              .from('video_generations')
              .update({
                status: 'failed',
                error_message: statusData.error || 'Video generation failed',
                updated_at: new Date().toISOString()
              })
              .eq('job_id', jobId);

            return NextResponse.json({
              jobId: job.job_id,
              status: 'failed',
              modelType: job.model_type,
              error: statusData.error || 'Video generation failed'
            });
          }
        }
      } catch (error) {
        console.error('Error polling fal.ai:', error);
      }
    }

    // 아직 처리 중
    return NextResponse.json({
      jobId: job.job_id,
      status: job.status,
      modelType: job.model_type,
      progress: job.status === 'processing' ? 50 : 0
    });

  } catch (error) {
    console.error('Poll error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}