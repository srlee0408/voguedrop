import * as fal from "@fal-ai/serverless-client";

// 서버사이드 전용 설정
if (typeof window === 'undefined' && process.env.FAL_API_KEY) {
  fal.config({
    credentials: process.env.FAL_API_KEY
  });
}

export interface VideoGenerationParams {
  imageUrl: string;
  prompt: string;
  modelType?: 'seedance' | 'hailo';
  duration?: string;
  resolution?: string;
}

export interface VideoGenerationResult {
  videoUrl: string;
  generationId?: string;
}

/**
 * fal.ai를 사용하여 이미지에서 비디오를 생성합니다.
 */
export async function generateVideo({
  imageUrl,
  prompt,
  modelType = 'seedance',
  duration,
  resolution = '1080p'
}: VideoGenerationParams): Promise<VideoGenerationResult> {
  // 모델별 엔드포인트 설정
  const modelEndpoint = modelType === 'seedance' 
    ? "fal-ai/bytedance/seedance/v1/pro/image-to-video"
    : "fal-ai/minimax/hailuo-02/standard/image-to-video";

  // 모델별 입력 파라미터 구성
  const input = modelType === 'seedance' 
    ? {
        prompt,
        resolution,
        duration: duration || "3",
        image_url: imageUrl
      }
    : {
        prompt,
        image_url: imageUrl,
        duration: duration || "6",
        prompt_optimizer: true
      };

  try {
    const result = await fal.run(modelEndpoint, {
      input
    }) as {
      video?: { url?: string };
      url?: string;
      output_url?: string;
      request_id?: string;
    };

    // 결과에서 비디오 URL 추출
    // fal.ai의 응답 구조에 따라 조정 필요
    const videoUrl = result?.video?.url || result?.url || result?.output_url;
    
    if (!videoUrl) {
      throw new Error('비디오 URL을 찾을 수 없습니다.');
    }

    return {
      videoUrl,
      generationId: result?.request_id
    };
  } catch (error) {
    console.error('Video generation error:', error);
    throw new Error(
      error instanceof Error 
        ? error.message 
        : '비디오 생성 중 오류가 발생했습니다.'
    );
  }
}

/**
 * 여러 효과 프롬프트를 하나로 결합합니다.
 */
export function combineEffectPrompts(
  effects: Array<{ prompt: string }>,
  basePrompt?: string
): string {
  const effectPrompts = effects
    .map(effect => effect.prompt)
    .filter(Boolean)
    .join(', ');

  if (basePrompt && effectPrompts) {
    return `${basePrompt}, ${effectPrompts}`;
  }
  
  return effectPrompts || basePrompt || '';
}