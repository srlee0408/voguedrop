import { nanoid } from 'nanoid';
import { checkDailyGenerationLimit } from '@/lib/db/video-generations';
import { uploadBase64Image } from '@/shared/lib/supabase/storage';
import { createClient } from '@/shared/lib/supabase/server';
import { createServiceClient } from '@/shared/lib/supabase/service';
import { createVideoGenerationLogger, measureAndLog } from '@/lib/logging/video-generation-logger';
import { 
  generateVideoRequestSchema, 
  type GenerateVideoRequest, 
  type GenerateVideoResponse,
  type EffectTemplate 
} from './schemas';

/**
 * Canvas 비디오 생성 서비스
 * 
 * @description
 * Canvas에서 이미지를 AI 비디오로 변환하는 비즈니스 로직을 담당합니다.
 * fal.ai API 호출, 데이터베이스 작업, 로깅 등을 처리합니다.
 */
export class VideoGenerationService {
  private readonly isMockMode = process.env.NEXT_PUBLIC_MOCK_MODE === 'true';
  private readonly webhookBaseUrl: string;

  constructor(webhookBaseUrl?: string) {
    this.webhookBaseUrl = webhookBaseUrl || process.env.NEXT_PUBLIC_SITE_URL || '';
  }

  /**
   * 비디오 생성 작업을 시작합니다
   * 
   * @param request - 비디오 생성 요청 데이터
   * @param user - 인증된 사용자 정보
   * @returns Promise<GenerateVideoResponse>
   */
  async generateVideo(
    request: GenerateVideoRequest, 
    user: { id: string }
  ): Promise<GenerateVideoResponse> {
    // 입력 검증
    const validated = generateVideoRequestSchema.parse(request);
    const { imageUrl, effectIds, basePrompt, duration } = validated;
    const userId = user.id;

    // 로거 초기화
    const temporaryJobId = `job_${nanoid()}`;
    const logger = createVideoGenerationLogger(temporaryJobId);
    
    await logger.info('Video generation request received', { 
      mockMode: this.isMockMode,
      userId,
      effectCount: effectIds.length 
    });

    try {
      // 1. 일일 생성 한도 확인
      await this.checkDailyLimit(userId, logger);

      // 2. 효과 템플릿 조회 및 프롬프트 결합
      const { selectedEffects, combinedPrompt } = await this.processEffects(
        effectIds, 
        basePrompt, 
        logger
      );

      // 3. 이미지 업로드 처리
      const finalImageUrl = await this.processImageUpload(imageUrl, userId, logger);

      // 4. 작업 생성 및 fal.ai API 호출
      const jobs = await this.createAndExecuteJobs(
        {
          userId,
          finalImageUrl,
          combinedPrompt,
          selectedEffects,
          duration: duration || '5',
          temporaryJobId,
          logger
        }
      );

      const successCount = jobs.filter(j => j.success).length;
      const failureCount = jobs.filter(j => !j.success).length;

      await logger.info('Video generation completed', {
        successCount,
        failureCount,
        totalJobs: jobs.length
      });

      return {
        success: true,
        jobs: jobs.map(j => ({
          jobId: j.jobId,
          status: j.success ? 'processing' : 'failed',
          error: j.error
        })),
        message: 'Video generation started. Please check the results later.'
      };

    } catch (error) {
      await logger.error('Video generation failed', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * 일일 생성 한도를 확인합니다
   */
  private async checkDailyLimit(userId: string, logger: ReturnType<typeof createVideoGenerationLogger>) {
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
      throw new Error(`Daily generation limit exceeded (${dailyLimit} jobs)`);
    }
  }

  /**
   * 효과 템플릿을 조회하고 프롬프트를 결합합니다
   */
  private async processEffects(
    effectIds: number[], 
    basePrompt?: string, 
    logger?: ReturnType<typeof createVideoGenerationLogger>
  ): Promise<{ selectedEffects: EffectTemplate[]; combinedPrompt: string }> {
    await logger?.info('Fetching effect prompts from database');
    
    let selectedEffects: EffectTemplate[] = [];
    let combinedPrompt = basePrompt || '';
    
    if (effectIds.length > 0) {
      const supabase = await createClient();
      const { data: effects, error: effectsError } = await supabase
        .from('effect_templates')
        .select('id, name, prompt')
        .in('id', effectIds)
        .eq('is_active', true);
        
      if (effectsError) {
        await logger?.error('Failed to fetch effect templates', effectsError);
        throw new Error('Failed to fetch effect templates');
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
    
    await logger?.info('Prompt combination completed', {
      prompt_length: combinedPrompt?.length || 0,
      effects_found: selectedEffects.length,
      has_base_prompt: !!basePrompt
    });
    
    if (!combinedPrompt || !combinedPrompt.trim()) {
      await logger?.error('Validation failed: No valid prompt generated');
      throw new Error('At least one effect or prompt is required');
    }

    return { selectedEffects, combinedPrompt };
  }

  /**
   * 이미지 업로드를 처리합니다
   */
  private async processImageUpload(
    imageUrl: string, 
    userId: string, 
    logger?: ReturnType<typeof createVideoGenerationLogger>
  ): Promise<string> {
    let finalImageUrl = imageUrl;
    
    if (imageUrl.startsWith('data:')) {
      await logger?.info('Uploading base64 image to storage');
      try {
        finalImageUrl = await measureAndLog(
          logger!,
          'base64 image upload',
          () => uploadBase64Image(imageUrl, userId)
        );
        await logger?.info('Image upload completed', { final_image_url: finalImageUrl });
      } catch (error) {
        await logger?.error('Image upload failed', error instanceof Error ? error : new Error(String(error)));
        throw new Error('Image upload failed');
      }
    } else {
      await logger?.info('Using provided image URL', { image_url: finalImageUrl });
    }

    return finalImageUrl;
  }

  /**
   * 작업을 생성하고 fal.ai API를 호출합니다
   */
  private async createAndExecuteJobs(params: {
    userId: string;
    finalImageUrl: string;
    combinedPrompt: string;
    selectedEffects: EffectTemplate[];
    duration: string;
    temporaryJobId: string;
    logger: ReturnType<typeof createVideoGenerationLogger>;
  }) {
    const { userId, finalImageUrl, combinedPrompt, selectedEffects, duration, temporaryJobId, logger } = params;
    
    // 현재는 hailo 모델만 사용
    const models: Array<'seedance' | 'hailo'> = ['hailo'];
    await logger.info('Creating jobs for models', { models });
    
    const jobs = await Promise.all(
      models.map(async (model) => {
        const jobId = models.length === 1 ? temporaryJobId : `job_${nanoid()}`;
        const modelLogger = models.length === 1 ? logger : createVideoGenerationLogger(jobId);
        
        return this.createSingleJob({
          jobId,
          model,
          userId,
          finalImageUrl,
          combinedPrompt,
          selectedEffects,
          duration,
          logger: modelLogger
        });
      })
    );

    return jobs;
  }

  /**
   * 단일 작업을 생성하고 처리합니다
   */
  private async createSingleJob(params: {
    jobId: string;
    model: 'seedance' | 'hailo';
    userId: string;
    finalImageUrl: string;
    combinedPrompt: string;
    selectedEffects: EffectTemplate[];
    duration: string;
    logger: ReturnType<typeof createVideoGenerationLogger>;
  }): Promise<{
    success: boolean;
    jobId: string;
    model: 'seedance' | 'hailo';
    requestId?: string;
    error?: string;
  }> {
    const { jobId, model, userId, finalImageUrl, combinedPrompt, selectedEffects, duration, logger } = params;

    try {
      // 데이터베이스 레코드 생성
      await logger.info('Creating database record for job', {
        model_type: model,
        job_id: jobId
      });
      
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
        await logger.error('Failed to create database record', error);
        throw new Error('Failed to create database record');
      }
      
      await logger.statusChange('new', 'pending', {
        database_record_id: data.id,
        model_type: model
      });

      // fal.ai API 호출 또는 Mock 처리
      if (this.isMockMode) {
        return await this.handleMockMode(jobId, userId, logger);
      } else {
        return await this.callFalApi(jobId, model, finalImageUrl, combinedPrompt, duration, userId, logger);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Request failed';
      await logger.error('Job creation failed', error instanceof Error ? error : new Error(errorMessage));
      
      // 실패 시 DB 업데이트
      await this.updateJobStatus(jobId, userId, 'failed', errorMessage);
      
      return {
        success: false,
        jobId,
        model,
        error: errorMessage
      };
    }
  }

  /**
   * Mock 모드를 처리합니다
   */
  private async handleMockMode(
    jobId: string, 
    userId: string, 
    logger: ReturnType<typeof createVideoGenerationLogger>
  ) {
    await logger.info('Mock mode enabled - skipping fal.ai API call');
    
    // 상태를 processing으로 업데이트
    await this.updateJobStatus(jobId, userId, 'processing', undefined, `mock_${jobId}`);
    
    // 5초 후 webhook 시뮬레이션
    setTimeout(async () => {
      try {
        const webhookUrl = `${this.webhookBaseUrl}/api/webhooks/fal-ai?jobId=${jobId}`;
        await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Secret': process.env.WEBHOOK_SECRET || 'test-secret'
          },
          body: JSON.stringify({
            request_id: `mock_${jobId}`,
            gateway_request_id: 'mock-gateway-id',
            status: 'OK',
            payload: {
              video: {
                url: 'https://v3.fal.media/files/lion/aFP5JZElM7NIblwIcEcBi_output.mp4'
              }
            }
          })
        });
      } catch {
        // Mock webhook error - 무시
      }
    }, 5000);
    
    return {
      success: true,
      jobId,
      requestId: `mock_${jobId}`,
      model: 'hailo' as const
    };
  }

  /**
   * fal.ai API를 호출합니다
   */
  private async callFalApi(
    jobId: string,
    model: 'seedance' | 'hailo',
    finalImageUrl: string,
    combinedPrompt: string,
    duration: string,
    userId: string,
    logger: ReturnType<typeof createVideoGenerationLogger>
  ) {
    const startTime = Date.now();
    
    // 모델별 엔드포인트 설정
    const endpoint = model === 'seedance' 
      ? "fal-ai/bytedance/seedance/v1/pro/image-to-video"
      : "fal-ai/minimax/hailuo-02/standard/image-to-video";

    const requestPayload = model === 'seedance' 
      ? {
          prompt: combinedPrompt,
          resolution: "1080p",
          duration: duration,
          image_url: finalImageUrl
        }
      : {
          prompt: combinedPrompt,
          image_url: finalImageUrl,
          duration: duration,
          prompt_optimizer: true
        };

    const webhookUrl = `${this.webhookBaseUrl}/api/webhooks/fal-ai?jobId=${jobId}`;
    
    await logger.falApiRequest(endpoint, requestPayload, {
      webhook_url: webhookUrl,
      model_type: model
    });

    // fal.ai queue API 호출
    const queueUrl = `https://queue.fal.run/${endpoint}?fal_webhook=${encodeURIComponent(webhookUrl)}`;
    
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
      const error = new Error(errorData.detail || 'fal.ai API call failed');
      await logger.falApiError(endpoint, error, requestDuration, {
        status_code: response.status,
        error_data: errorData
      });
      throw error;
    }

    const result = await response.json();
    
    await logger.falApiResponse(endpoint, result, requestDuration, {
      fal_request_id: result.request_id
    });
    
    // fal request ID 저장 및 상태 업데이트
    await this.updateJobStatus(jobId, userId, 'processing', undefined, result.request_id);
    
    await logger.statusChange('pending', 'processing', {
      fal_request_id: result.request_id
    });

    return {
      success: true,
      jobId,
      model,
      requestId: result.request_id
    };
  }

  /**
   * 작업 상태를 업데이트합니다
   */
  private async updateJobStatus(
    jobId: string, 
    userId: string, 
    status: 'processing' | 'failed', 
    errorMessage?: string,
    falRequestId?: string
  ) {
    const serviceSupabase = createServiceClient();
    
    const updateData: {
      status: 'processing' | 'failed';
      updated_at: string;
      error_message?: string;
      fal_request_id?: string;
    } = {
      status,
      updated_at: new Date().toISOString()
    };
    
    if (errorMessage) updateData.error_message = errorMessage;
    if (falRequestId) updateData.fal_request_id = falRequestId;
    
    await serviceSupabase
      .from('video_generations')
      .update(updateData)
      .eq('job_id', jobId)
      .eq('user_id', userId);
  }
}