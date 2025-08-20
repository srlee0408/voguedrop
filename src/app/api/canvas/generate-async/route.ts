import { NextRequest, NextResponse } from 'next/server';
import { checkDailyGenerationLimit } from '@/lib/db/video-generations';
import { uploadBase64Image } from '@/shared/lib/supabase/storage';
import { createClient } from '@/shared/lib/supabase/server';
import { createServiceClient } from '@/shared/lib/supabase/service';
import { requireAuth } from '@/lib/api/auth';
import { createVideoGenerationLogger, measureAndLog } from '@/lib/logging/video-generation-logger';
import { nanoid } from 'nanoid';

interface GenerateVideoRequest {
  imageUrl: string;
  effectIds: number[];
  basePrompt?: string;
  modelType?: 'seedance' | 'hailo';
  userId?: string;
  duration?: string;
}

export async function POST(request: NextRequest) {
  let logger: ReturnType<typeof createVideoGenerationLogger> | null = null;
  const isMockMode = process.env.NEXT_PUBLIC_MOCK_MODE === 'true';
  
  try {
    // Generate job ID early for logging
    const temporaryJobId = `job_${nanoid()}`;
    logger = createVideoGenerationLogger(temporaryJobId);
    
    await logger.info('Video generation request received', { mockMode: isMockMode });

    // 사용자 인증 확인 (보안 유틸리티 사용)
    const { user, error: authError } = await requireAuth(request);
    if (authError) {
      await logger.warning('Unauthorized request - user not logged in');
      return authError;
    }
    
    if (!user) {
      await logger.warning('Unauthorized request - user not found');
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }
    
    await logger.info('User authenticated', { user_id: user.id });
    
    // 1. 요청 데이터 검증
    const body: GenerateVideoRequest = await request.json();
    const { 
      imageUrl, 
      effectIds = [], 
      basePrompt = '',
      duration = '5'
    } = body;
    
    const userId = user.id;
    
    await logger.info('Request data parsed', {
      has_image_url: !!imageUrl,
      effects_count: effectIds.length,
      has_base_prompt: !!basePrompt,
      duration,
      effect_ids: effectIds
    });

    if (!imageUrl) {
      await logger.error('Validation failed: Missing image URL');
      return NextResponse.json(
        { error: '이미지 URL이 필요합니다.' },
        { status: 400 }
      );
    }

    // 2. 일일 생성 한도 확인
    const dailyLimit = parseInt(process.env.DAILY_GENERATION_LIMIT || '100');
    await logger.info('Checking daily generation limit', { daily_limit: dailyLimit });
    
    const { allowed, count } = await checkDailyGenerationLimit(userId, dailyLimit);
    
    await logger.info('Daily limit check completed', { 
      allowed, 
      current_count: count, 
      daily_limit: dailyLimit 
    });
    
    if (!allowed) {
      await logger.warning('Daily generation limit exceeded', {
        current_count: count,
        daily_limit: dailyLimit
      });
      return NextResponse.json(
        { 
          error: `일일 생성 한도(${dailyLimit}개)를 초과했습니다.`,
          dailyCount: count 
        },
        { status: 429 }
      );
    }

    // 3. 효과 ID로 프롬프트 조회 및 결합
    await logger.info('Fetching effect prompts from database');
    
    let selectedEffects: Array<{ id: number; name: string; prompt: string }> = [];
    let combinedPrompt = basePrompt || '';
    
    if (effectIds.length > 0) {
      // effect_templates는 공개 데이터이므로 일반 클라이언트 사용 가능
      const supabase = await createClient();
      const { data: effects, error: effectsError } = await supabase
        .from('effect_templates')
        .select('id, name, prompt')
        .in('id', effectIds)
        .eq('is_active', true);
        
      if (effectsError) {
        await logger.error('Failed to fetch effect templates', effectsError);
        return NextResponse.json(
          { error: '효과 정보를 불러오는데 실패했습니다.' },
          { status: 500 }
        );
      }
      
      if (effects) {
        selectedEffects = effects;
        const effectPrompts = effects.map(e => e.prompt).filter(p => p && p.trim());
        if (effectPrompts.length > 0) {
          combinedPrompt = combinedPrompt 
            ? `${combinedPrompt}. ${effectPrompts.join('. ')}`
            : effectPrompts.join('. ');
        }
      }
    }
    
    await logger.info('Prompt combination completed', {
      prompt_length: combinedPrompt?.length || 0,
      effects_found: selectedEffects.length,
      has_base_prompt: !!basePrompt
    });
    
    if (!combinedPrompt || !combinedPrompt.trim()) {
      await logger.error('Validation failed: No valid prompt generated');
      return NextResponse.json(
        { error: '최소 하나의 효과나 프롬프트가 필요합니다.' },
        { status: 400 }
      );
    }

    // 4. base64 이미지를 Supabase Storage에 업로드
    let finalImageUrl = imageUrl;
    if (imageUrl.startsWith('data:')) {
      await logger.info('Uploading base64 image to storage');
      try {
        finalImageUrl = await measureAndLog(
          logger,
          'base64 image upload',
          () => uploadBase64Image(imageUrl, userId)
        );
        await logger.info('Image upload completed', { final_image_url: finalImageUrl });
      } catch (error) {
        await logger.error('Image upload failed', error instanceof Error ? error : new Error(String(error)));
        return NextResponse.json(
          { error: '이미지 업로드에 실패했습니다.' },
          { status: 500 }
        );
      }
    } else {
      await logger.info('Using provided image URL', { image_url: finalImageUrl });
    }

    // 5. 각 모델에 대한 job 생성
    const models: Array<'seedance' | 'hailo'> = ['hailo']; // 임시로 hailo만 사용
    await logger.info('Creating jobs for models', { models });
    
    const jobs = await Promise.all(
      models.map(async (model) => {
        // Use the original job ID we created for logging, or create a new one for this model
        const jobId = models.length === 1 ? temporaryJobId : `job_${nanoid()}`;
        const modelLogger = models.length === 1 ? logger : createVideoGenerationLogger(jobId);
        
        await modelLogger?.info('Creating database record for job', {
          model_type: model,
          job_id: jobId
        });
        
        // DB에 초기 레코드 생성 (Service Client + user_id 명시)
        const serviceSupabase = createServiceClient();
        const { data, error } = await serviceSupabase
          .from('video_generations')
          .insert({
            job_id: jobId,
            user_id: userId,
            status: 'pending',
            input_image_url: finalImageUrl,
            prompt: combinedPrompt,
            selected_effects: selectedEffects.map(e => ({
              id: e.id,
              name: e.name,
              prompt: e.prompt
            })),
            model_type: model,
            webhook_status: 'pending'
          })
          .select('id, job_id, status')
          .single();

        if (error) {
          await modelLogger?.error('Failed to create database record', error);
          throw new Error('비디오 생성 요청을 저장하는데 실패했습니다.');
        }
        
        await modelLogger?.statusChange('new', 'pending', {
          database_record_id: data.id,
          model_type: model
        });

        return {
          jobId,
          model,
          generation: data,
          logger: modelLogger
        };
      })
    );
    
    await logger.info('All database records created successfully', {
      job_count: jobs.length,
      job_ids: jobs.map(j => j.jobId)
    });

    // 6. fal.ai에 비동기 요청 전송 (webhook URL 포함)
    const webhookBaseUrl = process.env.NEXT_PUBLIC_SITE_URL || 
                          `https://${request.headers.get('host')}`;
    
    await logger.info('Starting fal.ai API requests', {
      webhook_base_url: webhookBaseUrl,
      job_count: jobs.length
    });
    
    const falPromises = jobs.map(async (job) => {
      const jobLogger = job.logger;
      const startTime = Date.now();
      
      try {
        const webhookUrl = `${webhookBaseUrl}/api/webhooks/fal-ai?jobId=${job.jobId}`;
        // Webhook URL configured
        
        // Mock 모드에서는 fal.ai API 호출을 건너뛰고 5초 후 자동 완료
        if (isMockMode) {
          await jobLogger?.info('Mock mode enabled - skipping fal.ai API call');
          
          // 상태를 processing으로 업데이트 (user_id 조건 추가)
          const serviceSupabase = createServiceClient();
          
          await serviceSupabase
            .from('video_generations')
            .update({
              status: 'processing',
              fal_request_id: `mock_${job.jobId}`,
              updated_at: new Date().toISOString()
            })
            .eq('job_id', job.jobId)
            .eq('user_id', userId); // 보안: user_id 조건 추가
          
          // 5초 후 webhook 시뮬레이션
          setTimeout(async () => {
            try {
              const mockResponse = await fetch(webhookUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'X-Webhook-Secret': process.env.WEBHOOK_SECRET || 'test-secret'
                },
                body: JSON.stringify({
                  request_id: `mock_${job.jobId}`,
                  gateway_request_id: 'mock-gateway-id',
                  status: 'OK',
                  payload: {
                    video: {
                      url: 'https://v3.fal.media/files/lion/aFP5JZElM7NIblwIcEcBi_output.mp4'
                    }
                  }
                })
              });
              
              if (!mockResponse.ok) {
                // Mock webhook call failed
              } else {
                // Mock webhook call successful
              }
            } catch {
              // Mock webhook error
            }
          }, 5000);
          
          return {
            success: true,
            jobId: job.jobId,
            requestId: `mock_${job.jobId}`,
            model: job.model
          };
        }
        
        // 모델별 엔드포인트 설정
        const endpoint = job.model === 'seedance' 
          ? "fal-ai/bytedance/seedance/v1/pro/image-to-video"
          : "fal-ai/minimax/hailuo-02/standard/image-to-video";

        const requestPayload = job.model === 'seedance' 
          ? {
              prompt: combinedPrompt,
              resolution: "1080p",
              duration: duration || "5",
              image_url: finalImageUrl
            }
          : {
              prompt: combinedPrompt,
              image_url: finalImageUrl,
              duration: duration || "6",
              prompt_optimizer: true
            };

        await jobLogger?.falApiRequest(endpoint, requestPayload, {
          webhook_url: webhookUrl,
          model_type: job.model
        });

        // fal.ai queue API 호출
        const queueUrl = `https://queue.fal.run/${endpoint}?fal_webhook=${encodeURIComponent(webhookUrl)}`;
        // Calling fal.ai queue
        
        const response = await fetch(queueUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Key ${process.env.FAL_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestPayload)
        });

        const requestDuration = Date.now() - startTime;

        if (!response.ok) {
          const errorData = await response.json();
          const error = new Error(errorData.detail || 'fal.ai API 호출 실패');
          await jobLogger?.falApiError(endpoint, error, requestDuration, {
            status_code: response.status,
            error_data: errorData
          });
          throw error;
        }

        const result = await response.json();
        
        await jobLogger?.falApiResponse(endpoint, result, requestDuration, {
          fal_request_id: result.request_id
        });
        
        // fal request ID 저장 및 상태 업데이트 (user_id 조건 추가)
        const serviceSupabase = createServiceClient();
        
        const { error: updateError } = await serviceSupabase
          .from('video_generations')
          .update({
            fal_request_id: result.request_id,
            status: 'processing',
            updated_at: new Date().toISOString()
          })
          .eq('job_id', job.jobId)
          .eq('user_id', userId); // 보안: user_id 조건 추가
          
        if (updateError) {
          // Failed to update status to processing
          await jobLogger?.error('Failed to update database with fal request ID', updateError);
        } else {
          // Successfully updated status to processing
          await jobLogger?.statusChange('pending', 'processing', {
            fal_request_id: result.request_id
          });
        }

        return {
          success: true,
          jobId: job.jobId,
          model: job.model,
          requestId: result.request_id
        };
      } catch (error) {
        // const requestDuration = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : '요청 실패';
        
        await jobLogger?.error('fal.ai request failed', error instanceof Error ? error : new Error(errorMessage), {
          duration_ms: Date.now() - startTime
        });
        
        // 실패 시 DB 업데이트 (user_id 조건 추가)
        const failServiceSupabase = createServiceClient();
        
        const { error: updateError } = await failServiceSupabase
          .from('video_generations')
          .update({
            status: 'failed',
            error_message: errorMessage,
            updated_at: new Date().toISOString()
          })
          .eq('job_id', job.jobId)
          .eq('user_id', userId); // 보안: user_id 조건 추가
          
        if (updateError) {
          await jobLogger?.error('Failed to update database with failure status', updateError);
        } else {
          await jobLogger?.statusChange('pending', 'failed', {
            error_message: errorMessage
          });
        }

        return {
          success: false,
          jobId: job.jobId,
          model: job.model,
          error: errorMessage
        };
      }
    });

    const results = await Promise.all(falPromises);
    
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;
    
    await logger.info('All fal.ai requests completed', {
      success_count: successCount,
      failure_count: failureCount,
      results: results.map(r => ({
        job_id: r.jobId,
        success: r.success,
        error: r.error
      }))
    });

    // 7. 클라이언트에 즉시 응답 반환
    const response = {
      success: true,
      jobs: results.map(r => ({
        jobId: r.jobId,
        status: r.success ? 'processing' : 'failed',
        error: r.error
      })),
      message: '비디오 생성이 시작되었습니다. 잠시 후 결과를 확인해주세요.'
    };
    
    await logger.info('Sending response to client', response);
    
    return NextResponse.json(response);

  } catch (error) {
    // API error occurred
    
    if (logger) {
      await logger.error('Unhandled API error', error instanceof Error ? error : new Error(String(error)));
    }
    
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