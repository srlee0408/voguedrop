import { renderMediaOnLambda, getRenderProgress, AwsRegion } from '@remotion/lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { RENDER_CONFIG, S3_CONFIG, LAMBDA_CONFIG } from '../remotion.config';

// S3 클라이언트 초기화
const s3Client = new S3Client({
  region: S3_CONFIG.region,
});

interface RenderRequest {
  videoClips: unknown[];
  textClips: unknown[];
  soundClips: unknown[];
  aspectRatio: '9:16' | '1:1' | '16:9';
  durationInFrames: number;
  userId?: string;
  projectId?: string;
}

interface RenderResponse {
  success: boolean;
  url?: string;
  renderId?: string;
  error?: string;
}

// 화면 비율에 따른 컴포지션 ID 매핑
const getCompositionId = (aspectRatio: string): string => {
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
};

// 화면 비율에 따른 크기 반환
const getDimensions = (aspectRatio: string): { width: number; height: number } => {
  switch (aspectRatio) {
    case '9:16':
      return { width: 1080, height: 1920 };
    case '1:1':
      return { width: 1080, height: 1080 };
    case '16:9':
      return { width: 1920, height: 1080 };
    default:
      return { width: 1080, height: 1920 };
  }
};

// Lambda 핸들러 함수
export const handler = async (event: unknown): Promise<RenderResponse> => {
  try {
    // 요청 데이터 파싱
    const eventData = event as { body?: string };
    const request: RenderRequest = typeof eventData.body === 'string' 
      ? JSON.parse(eventData.body) 
      : event as RenderRequest;

    const {
      videoClips,
      textClips,
      soundClips,
      aspectRatio,
      durationInFrames,
      userId = 'anonymous',
      projectId = Date.now().toString(),
    } = request;

    // 컴포지션 ID와 크기 가져오기
    const compositionId = getCompositionId(aspectRatio);
    const dimensions = getDimensions(aspectRatio);

    // 출력 파일명 생성
    const outputFileName = `${userId}/${projectId}/video-${Date.now()}.mp4`;
    
    console.log('Starting render:', {
      compositionId,
      dimensions,
      durationInFrames,
      outputFileName,
    });

    // Remotion Lambda에서 비디오 렌더링
    const { renderId, bucketName } = await renderMediaOnLambda({
      region: LAMBDA_CONFIG.region as AwsRegion,
      functionName: LAMBDA_CONFIG.functionName,
      composition: compositionId,
      serveUrl: process.env.REMOTION_SERVE_URL!, // Remotion 번들 URL (배포 시 설정)
      codec: RENDER_CONFIG.codec,
      imageFormat: RENDER_CONFIG.imageFormat,
      jpegQuality: RENDER_CONFIG.jpegQuality,
      audioCodec: RENDER_CONFIG.audioCodec,
      videoBitrate: RENDER_CONFIG.videoBitrate,
      inputProps: {
        videoClips,
        textClips,
        soundClips,
        backgroundColor: 'black',
      },
      outName: outputFileName,
      privacy: S3_CONFIG.privacy,
      timeoutInMilliseconds: RENDER_CONFIG.timeoutInMilliseconds,
      maxRetries: RENDER_CONFIG.maxRetries,
      chromiumOptions: RENDER_CONFIG.chromiumOptions,
      ...dimensions,
      // Composition의 기본 durationInFrames를 오버라이드
      frameRange: [0, durationInFrames - 1],
    });

    console.log('Render started:', { renderId, bucketName });

    // 렌더링 진행 상황 확인 (옵션)
    let renderProgress = await getRenderProgress({
      renderId,
      bucketName,
      functionName: LAMBDA_CONFIG.functionName,
      region: LAMBDA_CONFIG.region as AwsRegion,
    });

    // 렌더링 완료 대기
    while (renderProgress.overallProgress < 1) {
      await new Promise(resolve => setTimeout(resolve, 3000)); // 3초 대기
      renderProgress = await getRenderProgress({
        renderId,
        bucketName,
        functionName: LAMBDA_CONFIG.functionName,
        region: LAMBDA_CONFIG.region as AwsRegion,
      });
      console.log('Render progress:', renderProgress.overallProgress);
    }

    // 완료된 파일 URL 생성
    const fileUrl = `https://${bucketName}.s3.${S3_CONFIG.region}.amazonaws.com/${outputFileName}`;

    console.log('Render completed:', fileUrl);

    return {
      success: true,
      url: fileUrl,
      renderId,
    };
  } catch (error) {
    console.error('Render error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
};

// 렌더링 상태 확인 함수 (별도 엔드포인트용)
export const checkRenderStatus = async (event: unknown): Promise<unknown> => {
  try {
    const eventData = event as { body?: string };
    const { renderId, bucketName } = JSON.parse(eventData.body || '{}');

    const progress = await getRenderProgress({
      renderId,
      bucketName,
      functionName: LAMBDA_CONFIG.functionName,
      region: LAMBDA_CONFIG.region as AwsRegion,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        progress: progress.overallProgress,
        done: progress.done,
        outputFile: progress.outputFile,
      }),
    };
  } catch (error) {
    console.error('Status check error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }),
    };
  }
};