import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

interface RouteParams {
  params: Promise<{
    jobId: string;
  }>;
}

async function checkFalApiStatus(falRequestId: string, modelType: string) {
  try {
    // 모델별 엔드포인트 설정
    const endpoint = modelType === 'seedance' 
      ? "fal-ai/bytedance/seedance/v1/pro/image-to-video"
      : "fal-ai/minimax/hailuo-02/standard/image-to-video";
    
    // Queue API status endpoint
    const statusUrl = `https://queue.fal.run/${endpoint}/requests/${falRequestId}/status`;
    
    console.log(`Checking fal.ai status for ${falRequestId} at:`, statusUrl);
    
    const response = await fetch(statusUrl, {
      headers: {
        'Authorization': `Key ${process.env.FAL_API_KEY}`
      }
    });

    if (!response.ok) {
      console.error('Failed to check fal.ai status:', response.status);
      const errorText = await response.text();
      console.error('Error response:', errorText);
      return { completed: false, status: 'error' };
    }

    const statusData = await response.json();
    console.log('fal.ai status response:', statusData);

    // Queue API 상태 확인
    if (statusData.status === 'COMPLETED') {
      // response_url이 없을 경우 requests 엔드포인트 사용
      const responseUrl = statusData.response_url || `https://queue.fal.run/${endpoint}/requests/${falRequestId}`;
      
      const resultResponse = await fetch(responseUrl, {
        headers: {
          'Authorization': `Key ${process.env.FAL_API_KEY}`
        }
      });

      if (resultResponse.ok) {
        const resultData = await resultResponse.json();
        console.log('fal.ai result data:', resultData);
        
        // response 객체 안에 실제 결과가 있을 수 있음
        const videoUrl = resultData.video?.url || resultData.response?.video?.url;
        
        if (videoUrl) {
          return {
            completed: true,
            status: 'completed',
            videoUrl: videoUrl
          };
        } else {
          console.error('No video URL found in result:', resultData);
          return {
            completed: true,
            status: 'failed',
            error: 'No video URL in response'
          };
        }
      } else {
        console.error('Failed to get result:', resultResponse.status);
        return {
          completed: true,
          status: 'failed',
          error: 'Failed to retrieve result'
        };
      }
    } else if (statusData.status === 'IN_QUEUE') {
      return {
        completed: false,
        status: 'queued',
        queuePosition: statusData.queue_position
      };
    } else if (statusData.status === 'IN_PROGRESS') {
      return {
        completed: false,
        status: 'processing',
        logs: statusData.logs
      };
    } else if (statusData.status === 'FAILED') {
      // 실패한 경우에도 결과를 가져와서 에러 메시지 확인
      const responseUrl = statusData.response_url || `https://queue.fal.run/${endpoint}/requests/${falRequestId}`;
      
      try {
        const errorResponse = await fetch(responseUrl, {
          headers: {
            'Authorization': `Key ${process.env.FAL_API_KEY}`
          }
        });
        
        if (errorResponse.ok) {
          const errorData = await errorResponse.json();
          return {
            completed: true,
            status: 'failed',
            error: errorData.error || errorData.message || 'Video generation failed'
          };
        }
      } catch (e) {
        console.error('Error fetching failure details:', e);
      }
      
      return {
        completed: true,
        status: 'failed',
        error: 'Video generation failed'
      };
    }

    return { completed: false, status: statusData.status || 'unknown' };
  } catch (error) {
    console.error('Error checking fal.ai status:', error);
    return { completed: false, status: 'error', error: error instanceof Error ? error.message : 'Unknown error' };
  }
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

    const elapsedTime = Date.now() - new Date(job.created_at).getTime();
    const elapsedMinutes = Math.floor(elapsedTime / 60000);
    
    // 응답 데이터 기본 구성
    const responseData = {
      jobId: job.job_id,
      webhookStatus: job.webhook_status,
      status: job.status,
      elapsedMinutes,
      webhookCheckRequired: false,
      message: ''
    };

    // 5분 경과 후 webhook이 pending 상태면 fal.ai API 직접 확인
    if (job.webhook_status === 'pending' && elapsedMinutes >= 5 && job.fal_request_id) {
      console.log(`Webhook timeout for job ${jobId} after ${elapsedMinutes} minutes, checking fal.ai directly`);
      
      responseData.webhookCheckRequired = true;
      responseData.message = 'Webhook 수신 지연으로 fal.ai API 직접 확인 중';

      // fal.ai 상태 직접 확인
      const falStatus = await checkFalApiStatus(job.fal_request_id, job.model_type);
      
      if (falStatus.completed) {
        // Service client로 DB 업데이트
        const serviceSupabase = createServiceClient();
        
        const updateData: Record<string, unknown> = {
          webhook_status: 'timeout',
          updated_at: new Date().toISOString()
        };

        if (falStatus.status === 'completed' && falStatus.videoUrl) {
          updateData.status = 'completed';
          updateData.output_video_url = falStatus.videoUrl;
          responseData.message = 'fal.ai 직접 확인으로 비디오 생성 완료 확인';
        } else if (falStatus.status === 'failed') {
          updateData.status = 'failed';
          updateData.error_message = falStatus.error || 'Video generation failed';
          responseData.message = 'fal.ai 직접 확인으로 생성 실패 확인';
        }

        const { error: updateError } = await serviceSupabase
          .from('video_generations')
          .update(updateData)
          .eq('job_id', jobId);
          
        if (updateError) {
          console.error('Failed to update job status:', updateError);
        } else {
          console.log(`Job ${jobId} updated via fal.ai check:`, updateData);
          responseData.status = updateData.status || job.status;
        }
      }
    } else if (job.webhook_status === 'delivered') {
      responseData.message = 'Webhook 정상 수신됨';
    } else if (job.webhook_status === 'failed') {
      responseData.message = 'Webhook 수신 실패';
    } else if (elapsedMinutes < 5) {
      responseData.message = `Webhook 대기 중 (${elapsedMinutes}분 경과)`;
    }

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Check webhook error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}