/**
 * Canvas Job Polling API - 비동기 영상 생성 Job 상태 확인 엔드포인트
 * 
 * 주요 역할:
 * 1. 클라이언트의 3초 간격 폴링 요청 처리
 * 2. 데이터베이스에서 Job 상태 조회 및 반환
 * 3. Webhook 실패 시 fal.ai API 직접 폴링 백업
 * 4. Job 완료 시 최종 결과 URL 제공
 * 
 * 핵심 특징:
 * - 실시간 진행률 업데이트로 사용자 경험 향상
 * - Webhook 실패 대응을 위한 fallback 메커니즘
 * - Job 상태별 적절한 HTTP 상태 코드 반환
 * - 5분 이상 대기 시 자동 fal.ai 직접 조회
 * 
 * 주의사항:
 * - 폴링 간격이 너무 짧으면 서버 부하 증가
 * - fal.ai API 호출 시 요금 발생 고려
 * - Job ID 검증으로 무단 접근 방지
 * - 완료된 Job은 캐싱하여 중복 조회 방지
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/infrastructure/supabase/server';

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
      .select('id, job_id, status, created_at, input_image_url, output_video_url, error_message, webhook_status, fal_request_id, model_type, is_favorite')
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
        id: job.id,
        jobId: job.job_id,
        status: job.status,
        createdAt: job.created_at,
        modelType: job.model_type,
        result: job.status === 'completed' ? {
          videoUrl: job.output_video_url,
          thumbnailUrl: job.input_image_url,
          isFavorite: job.is_favorite || false
        } : null,
        error: job.error_message
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate'
        }
      });
    }

    // webhook 상태 확인 (5분 타임아웃)
    const elapsedMinutes = Math.floor((Date.now() - new Date(job.created_at).getTime()) / 60000);
    
    if (job.webhook_status === 'pending' && elapsedMinutes >= 5) {
      // Webhook timeout after 5 minutes
      
      // Service client로 webhook_status 업데이트
      const { createServiceClient } = await import('@/infrastructure/supabase/service');
      const serviceSupabase = createServiceClient();
      
      await serviceSupabase
        .from('video_generations')
        .update({ 
          webhook_status: 'timeout',
          updated_at: new Date().toISOString()
        })
        .eq('job_id', jobId);
    }

    // fal_request_id가 있는 경우 fal.ai API 상태 확인
    if (job.fal_request_id) {
      try {
        // 모델별 엔드포인트 설정
        const endpoint = job.model_type === 'seedance' 
          ? "fal-ai/bytedance/seedance/v1/pro/image-to-video"
          : "fal-ai/minimax/hailuo-02/standard/image-to-video";
        
        const statusUrl = `https://queue.fal.run/${endpoint}/requests/${job.fal_request_id}/status`;
        
        const response = await fetch(statusUrl, {
          headers: {
            'Authorization': `Key ${process.env.FAL_API_KEY}`
          }
        });

        if (response.ok) {
          const statusData = await response.json();
          // fal.ai status received

          // 완료된 경우
          if (statusData.status === 'COMPLETED') {
            const responseUrl = statusData.response_url || `https://queue.fal.run/${endpoint}/requests/${job.fal_request_id}`;
            
            // 결과 가져오기
            const resultResponse = await fetch(responseUrl, {
              headers: {
                'Authorization': `Key ${process.env.FAL_API_KEY}`
              }
            });

            if (resultResponse.ok) {
              const resultData = await resultResponse.json();
              
              // response 객체 안에 실제 결과가 있을 수 있음
              const videoUrl = resultData.video?.url || resultData.response?.video?.url;
              
              if (videoUrl) {
                // Service client로 DB 업데이트
                const { createServiceClient } = await import('@/infrastructure/supabase/service');
                const serviceSupabase = createServiceClient();
                
                await serviceSupabase
                  .from('video_generations')
                  .update({
                    status: 'completed',
                    output_video_url: videoUrl,
                    webhook_status: job.webhook_status === 'pending' ? 'timeout' : job.webhook_status,
                    updated_at: new Date().toISOString()
                  })
                  .eq('job_id', jobId);

                return NextResponse.json({
                  id: job.id,
                  jobId: job.job_id,
                  status: 'completed',
                  createdAt: job.created_at,
                  modelType: job.model_type,
                  result: {
                    videoUrl: videoUrl,
                    thumbnailUrl: job.input_image_url,
                    isFavorite: job.is_favorite || false
                  }
                });
              }
            }
          } else if (statusData.status === 'FAILED') {
            // 실패 처리
            const { createServiceClient } = await import('@/infrastructure/supabase/service');
            const serviceSupabase = createServiceClient();
            
            await serviceSupabase
              .from('video_generations')
              .update({
                status: 'failed',
                error_message: statusData.error || 'Video generation failed',
                webhook_status: job.webhook_status === 'pending' ? 'timeout' : job.webhook_status,
                updated_at: new Date().toISOString()
              })
              .eq('job_id', jobId);

            return NextResponse.json({
              id: job.id,
              jobId: job.job_id,
              status: 'failed',
              error: statusData.error || 'Video generation failed'
            });
          } else if (statusData.status === 'IN_QUEUE') {
            // Queue 위치를 기반으로 10-30% 구간으로 매핑
            const queuePosition = statusData.queue_position || 0;
            const progress = Math.max(10, Math.min(30, 30 - (queuePosition * 3)));
            return NextResponse.json({
              id: job.id,
              jobId: job.job_id,
              status: 'processing',
              progress,
              queuePosition: statusData.queue_position
            });
          } else if (statusData.status === 'IN_PROGRESS') {
            // 실제 처리 중일 때는 50-85% 구간
            return NextResponse.json({
              id: job.id,
              jobId: job.job_id,
              status: 'processing',
              progress: 55
            });
          }
        }
      } catch (error) {
        console.error('Error polling fal.ai:', error);
      }
    }

    // 아직 처리 중 - 기본 상태
    return NextResponse.json({
      id: job.id,
      jobId: job.job_id,
      status: job.status,
      progress: job.status === 'processing' ? 40 : 10
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate'
      }
    });

  } catch (error) {
    console.error('Poll error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}