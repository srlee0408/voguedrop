import { renderMediaOnLambda, getRenderProgress } from '@remotion/lambda';
import { AwsRegion } from '@remotion/lambda';
import { createClient } from '@/shared/lib/supabase/server';
import { RENDER_CONFIG } from '../../../../remotion.config';
import { 
  renderRequestSchema, 
  renderStatusRequestSchema,
  type RenderRequest, 
  type RenderStatusRequest,
  type RenderResponse,
  type RenderStatusResponse
} from './schemas';

/**
 * Remotion 렌더링 설정
 */
interface RemotionConfig {
  codec: 'h264' | 'h265';
  imageFormat: 'png' | 'jpeg';
  jpegQuality: number;
  audioCodec: 'aac' | 'mp3';
  videoBitrate: string;
  audioBitrate: string;
  chromiumOptions: Record<string, unknown>;
  timeoutInMilliseconds: number;
  maxRetries: number;
}

/**
 * Video Editor 렌더링 서비스
 * 
 * @description
 * Remotion Lambda를 사용한 비디오 렌더링 및 진행 상황 추적을 담당합니다.
 * AWS Lambda에서 실행되는 렌더링 작업을 관리합니다.
 */
export class RenderService {
  private readonly renderConfig: RemotionConfig;

  constructor(renderConfig?: Partial<RemotionConfig>) {
    // remotion.config.ts에서 기본 설정 가져오기
    this.renderConfig = {
      codec: RENDER_CONFIG.codec,
      imageFormat: RENDER_CONFIG.imageFormat,
      jpegQuality: RENDER_CONFIG.jpegQuality,
      audioCodec: RENDER_CONFIG.audioCodec,
      videoBitrate: RENDER_CONFIG.videoBitrate,
      audioBitrate: RENDER_CONFIG.audioBitrate,
      chromiumOptions: {
        '--disable-web-security': true,
        '--disable-features=VizDisplayCompositor': true,
      },
      timeoutInMilliseconds: RENDER_CONFIG.timeoutInMilliseconds,
      maxRetries: RENDER_CONFIG.maxRetries,
      ...renderConfig
    };
  }

  /**
   * 비디오 렌더링을 시작합니다
   * 
   * @param request - 렌더링 요청 데이터
   * @param user - 인증된 사용자 정보
   * @returns Promise<RenderResponse>
   */
  async startRender(
    request: RenderRequest, 
    user: { id: string }
  ): Promise<RenderResponse> {
    // 입력 검증
    const validated = renderRequestSchema.parse(request);
    const { 
      videoClips, 
      textClips, 
      soundClips, 
      aspectRatio, 
      durationInFrames, 
      projectName,
      contentHash,
      projectSaveId 
    } = validated;

    const userId = user.id;

    console.log('Starting render request:', {
      userId,
      clipCount: videoClips.length,
      textClips: textClips.length,
      soundClips: soundClips.length,
      aspectRatio,
      durationInFrames,
      durationInSeconds: durationInFrames / 30,
    });

    // Remotion Lambda 설정
    const compositionId = this.getCompositionId(aspectRatio);
    const region = (process.env.AWS_REGION || 'us-east-1') as AwsRegion;
    const functionName = process.env.LAMBDA_FUNCTION_NAME || 'remotion-render-us-east-1';
    const serveUrl = process.env.REMOTION_SERVE_URL;

    if (!serveUrl) {
      throw new Error('REMOTION_SERVE_URL is not configured');
    }

    // 출력 파일명 생성
    const outputKey = `${userId}/${Date.now()}/video.mp4`;

    console.log('Invoking Lambda render:', {
      compositionId,
      functionName,
      region,
      outputKey,
    });

    // Lambda에서 비디오 렌더링
    const result = await renderMediaOnLambda({
      region,
      functionName,
      composition: compositionId,
      serveUrl,
      codec: this.renderConfig.codec,
      imageFormat: this.renderConfig.imageFormat,
      jpegQuality: this.renderConfig.jpegQuality,
      audioCodec: this.renderConfig.audioCodec,
      videoBitrate: this.renderConfig.videoBitrate,
      audioBitrate: this.renderConfig.audioBitrate,
      chromiumOptions: this.renderConfig.chromiumOptions,
      inputProps: {
        videoClips,
        textClips,
        soundClips,
        backgroundColor: 'black',
      },
      outName: outputKey,
      privacy: 'public',
      downloadBehavior: {
        type: 'download',
        fileName: `video-${Date.now()}.mp4`,
      },
      framesPerLambda: 150, // 5초씩 나누어 처리
      timeoutInMilliseconds: this.renderConfig.timeoutInMilliseconds,
      maxRetries: this.renderConfig.maxRetries,
      overwrite: true,
      // Composition의 기본 durationInFrames를 오버라이드
      frameRange: [0, durationInFrames - 1],
    });

    console.log('Lambda render started:', {
      renderId: result.renderId,
      bucketName: result.bucketName,
    });

    // 렌더링 기록 저장
    await this.saveRenderRecord({
      userId,
      projectName: projectName || `Video-${new Date().toISOString().split('T')[0]}`,
      renderId: result.renderId,
      aspectRatio,
      durationInFrames,
      contentHash,
      projectSaveId,
      videoClips,
      textClips,
      soundClips
    });

    return {
      success: true,
      renderId: result.renderId,
      bucketName: result.bucketName,
      status: 'processing',
      message: '렌더링이 시작되었습니다. 잠시 후 진행 상황을 확인해주세요.',
    };
  }

  /**
   * 렌더링 진행 상황을 확인합니다
   * 
   * @param request - 렌더링 상태 확인 요청 데이터
   * @returns Promise<RenderStatusResponse>
   */
  async getRenderStatus(
    request: RenderStatusRequest
  ): Promise<RenderStatusResponse> {
    // 입력 검증
    const validated = renderStatusRequestSchema.parse(request);
    const { renderId, bucketName } = validated;

    const region = (process.env.AWS_REGION || 'us-east-1') as AwsRegion;
    const functionName = process.env.LAMBDA_FUNCTION_NAME || 'remotion-render-us-east-1';
    const defaultBucketName = bucketName || process.env.AWS_S3_BUCKET_NAME || 'voguedrop-renders';

    // Lambda에서 렌더링 진행 상황 확인
    const progress = await getRenderProgress({
      renderId,
      bucketName: defaultBucketName,
      functionName,
      region,
    });

    // 렌더링 완료 시 DB 상태 업데이트
    if (progress.done && progress.outputFile) {
      await this.updateRenderStatus(renderId, 'completed', progress.outputFile);
    }

    return {
      success: true,
      done: progress.done,
      overallProgress: progress.overallProgress,
      outputFile: progress.outputFile,
      errors: progress.errors?.map(error => error.message || String(error)) || [],
    };
  }

  /**
   * 화면 비율에 따른 컴포지션 ID를 반환합니다
   * 
   * @private
   */
  private getCompositionId(aspectRatio: string): string {
    switch (aspectRatio) {
      case '9:16':
        return 'video-mobile';
      case '1:1':
        return 'video-square';
      case '16:9':
        return 'video-wide';
      default:
        return 'video-mobile';
    }
  }

  /**
   * 렌더링 기록을 데이터베이스에 저장합니다
   * 
   * @private
   */
  private async saveRenderRecord(params: {
    userId: string;
    projectName: string;
    renderId: string;
    aspectRatio: string;
    durationInFrames: number;
    contentHash?: string;
    projectSaveId?: number;
    videoClips: unknown[];
    textClips: unknown[];
    soundClips: unknown[];
  }) {
    const {
      userId,
      projectName,
      renderId,
      aspectRatio,
      durationInFrames,
      contentHash,
      projectSaveId,
      videoClips,
      textClips,
      soundClips
    } = params;

    const supabase = await createClient();

    const { data: renderRecord, error: dbError } = await supabase
      .from('video_renders')
      .insert({
        user_id: userId,
        project_name: projectName,
        render_id: renderId,
        status: 'processing',
        aspect_ratio: aspectRatio,
        duration_frames: durationInFrames,
        output_url: null,
        content_hash: contentHash || null,
        project_save_id: projectSaveId || null,
        video_clips: videoClips,
        text_clips: textClips,
        sound_clips: soundClips,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database insert error:', dbError);
      // DB 에러는 무시하고 계속 진행
    } else if (renderRecord && projectSaveId) {
      // video_renders 레코드가 성공적으로 생성되었고 projectSaveId가 있으면
      // project_saves 테이블의 latest_render_id를 업데이트
      const { error: updateError } = await supabase
        .from('project_saves')
        .update({ 
          latest_render_id: renderId,
          updated_at: new Date().toISOString()
        })
        .eq('id', projectSaveId)
        .eq('user_id', userId);

      if (updateError) {
        console.error('Failed to update project_saves with render_id:', updateError);
      }
    }
  }

  /**
   * 렌더링 상태를 업데이트합니다
   * 
   * @private
   */
  private async updateRenderStatus(
    renderId: string, 
    status: 'completed' | 'failed', 
    outputUrl?: string
  ) {
    try {
      const supabase = await createClient();
      await supabase
        .from('video_renders')
        .update({
          status,
          output_url: outputUrl || null,
          completed_at: new Date().toISOString(),
        })
        .eq('render_id', renderId);
    } catch (dbError) {
      console.error('Database update error:', dbError);
    }
  }
}