import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { renderMediaOnLambda, getRenderProgress } from '@remotion/lambda';
import { AwsRegion } from '@remotion/lambda';
import { RENDER_CONFIG } from '@/remotion.config';

interface RenderRequest {
  videoClips: unknown[];
  textClips: unknown[];
  soundClips: unknown[];
  aspectRatio: '9:16' | '1:1' | '16:9';
  durationInFrames: number;
  projectName?: string;
  contentHash?: string; // content hash 추가
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

export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 요청 데이터 파싱
    const body: RenderRequest = await request.json();
    const { videoClips, textClips, soundClips, aspectRatio, durationInFrames, projectName, contentHash } = body;

    // 유효성 검사
    if (!videoClips || videoClips.length === 0) {
      return NextResponse.json(
        { error: 'At least one video clip is required' },
        { status: 400 }
      );
    }

    if (!aspectRatio || !['9:16', '1:1', '16:9'].includes(aspectRatio)) {
      return NextResponse.json(
        { error: 'Invalid aspect ratio' },
        { status: 400 }
      );
    }

    if (!durationInFrames || durationInFrames <= 0) {
      return NextResponse.json(
        { error: 'Invalid duration' },
        { status: 400 }
      );
    }

    // 최대 duration 제한 (2분 = 3600 프레임)
    const MAX_DURATION_FRAMES = 3600;
    if (durationInFrames > MAX_DURATION_FRAMES) {
      return NextResponse.json(
        { 
          error: 'Duration exceeds maximum limit',
          details: `Maximum allowed duration is ${MAX_DURATION_FRAMES / 30} seconds (${MAX_DURATION_FRAMES} frames)`
        },
        { status: 400 }
      );
    }

    console.log('Starting render request:', {
      userId: user.id,
      clipCount: videoClips.length,
      textClips: textClips.length,
      soundClips: soundClips.length,
      aspectRatio,
      durationInFrames,
      durationInSeconds: durationInFrames / 30,
    });

    // Lambda에서 직접 렌더링
    const compositionId = getCompositionId(aspectRatio);
    const region = (process.env.AWS_REGION || 'us-east-1') as AwsRegion;
    const functionName = process.env.LAMBDA_FUNCTION_NAME || 'remotion-render-us-east-1';
    const serveUrl = process.env.REMOTION_SERVE_URL;

    if (!serveUrl) {
      throw new Error('REMOTION_SERVE_URL is not configured');
    }

    // 출력 파일명 생성
    const outputKey = `${user.id}/${Date.now()}/video.mp4`;

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
      codec: RENDER_CONFIG.codec,
      imageFormat: RENDER_CONFIG.imageFormat,
      jpegQuality: RENDER_CONFIG.jpegQuality,
      audioCodec: RENDER_CONFIG.audioCodec,
      videoBitrate: RENDER_CONFIG.videoBitrate,
      audioBitrate: RENDER_CONFIG.audioBitrate,
      chromiumOptions: RENDER_CONFIG.chromiumOptions,
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
      framesPerLambda: 150, // 3초씩 나누어 처리 (10초 = 3-4개 Lambda)
      timeoutInMilliseconds: RENDER_CONFIG.timeoutInMilliseconds,
      maxRetries: RENDER_CONFIG.maxRetries,
      overwrite: true,
      // Composition의 기본 durationInFrames를 오버라이드
      frameRange: [0, durationInFrames - 1],
    });

    console.log('Lambda render started:', {
      renderId: result.renderId,
      bucketName: result.bucketName,
    });

    // 렌더링 기록 저장 (content_hash 포함)
    const { error: dbError } = await supabase
      .from('video_renders')
      .insert({
        user_id: user.id,
        project_name: projectName || `Video-${new Date().toISOString().split('T')[0]}`,
        render_id: result.renderId,
        status: 'processing',
        aspect_ratio: aspectRatio,
        duration_frames: durationInFrames,
        output_url: null,
        content_hash: contentHash || null, // content hash 저장
        video_clips: videoClips,
        text_clips: textClips,
        sound_clips: soundClips,
        created_at: new Date().toISOString(),
      });

    if (dbError) {
      console.error('Database insert error:', dbError);
      // DB 에러는 무시하고 계속 진행
    }

    // 즉시 renderId와 함께 응답 반환 (진행 상황은 클라이언트에서 확인)
    // 이렇게 하면 Lambda 동시 실행 제한을 피할 수 있습니다
    return NextResponse.json({
      success: true,
      renderId: result.renderId,
      bucketName: result.bucketName,
      status: 'processing',
      message: '렌더링이 시작되었습니다. 잠시 후 진행 상황을 확인해주세요.',
    });
  } catch (error) {
    console.error('Render API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to start render',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// 렌더링 상태 확인 엔드포인트
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const renderId = searchParams.get('renderId');
    
    if (!renderId) {
      return NextResponse.json(
        { error: 'renderId is required' },
        { status: 400 }
      );
    }

    const region = (process.env.AWS_REGION || 'us-east-1') as AwsRegion;
    const functionName = process.env.LAMBDA_FUNCTION_NAME || 'remotion-render-us-east-1';
    const bucketName = searchParams.get('bucketName') || process.env.AWS_S3_BUCKET_NAME || 'voguedrop-renders';

    // Lambda에서 렌더링 진행 상황 확인
    const progress = await getRenderProgress({
      renderId,
      bucketName,
      functionName,
      region,
    });

    // DB 상태 업데이트 (선택적)
    if (progress.done && progress.outputFile) {
      try {
        const supabase = await createClient();
        await supabase
          .from('video_renders')
          .update({
            status: 'completed',
            output_url: progress.outputFile,
            completed_at: new Date().toISOString(),
          })
          .eq('render_id', renderId);
      } catch (dbError) {
        console.error('Database update error:', dbError);
      }
    }

    return NextResponse.json({
      success: true,
      done: progress.done,
      overallProgress: progress.overallProgress,
      outputFile: progress.outputFile,
      errors: progress.errors,
    });
  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check render status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}