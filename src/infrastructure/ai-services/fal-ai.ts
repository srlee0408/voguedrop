/**
 * fal.ai API 통합 모듈
 * 
 * 호출 흐름:
 * 1. /app/canvas/page.tsx → Generate 버튼 클릭
 * 2. /app/api/canvas/generate/route.ts → POST 요청 처리
 * 3. 이 파일의 generateVideo() 함수 호출
 * 4. fal.run() → fal.ai API 실제 호출 (54줄)
 */
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

  // 프롬프트 길이 제한 제거 - 원본 그대로 사용
  const truncatedPrompt = prompt;

  // 모델별 입력 파라미터 구성
  const input = modelType === 'seedance' 
    ? {
        prompt: truncatedPrompt,
        resolution,
        duration: duration || "5",
        image_url: imageUrl
      }
    : {
        prompt: truncatedPrompt,
        image_url: imageUrl,
        duration: duration || "6",  // 사용자가 선택한 duration 사용
        prompt_optimizer: true
      };


  try {
    // ⭐️ fal.ai API 실제 호출 지점 (subscribe 방식)
    // 긴 처리 시간을 위한 비동기 큐 기반 처리
    
    const result = await fal.subscribe(modelEndpoint, {
      input,
      logs: true,
      onQueueUpdate: (update) => {
        // Status update handling
        if (update.status === "IN_PROGRESS" || update.status === "IN_QUEUE") {
          // Silent processing
        }
      }
    }) as { video?: { url?: string }; requestId?: string };


    // fal.subscribe 응답 구조 확인
    // 실제로는 result 자체에 video가 있음 (data 래핑 없이)
    const videoUrl = result?.video?.url;
    
    if (!videoUrl) {
      console.error('Result structure:', {
        hasVideo: !!result?.video,
        keys: Object.keys(result || {}),
        result: result
      });
      throw new Error('비디오 URL을 찾을 수 없습니다.');
    }

    return {
      videoUrl,
      generationId: result?.requestId || Date.now().toString()
    };
  } catch (error) {
    console.error('Video generation error:', error);
    // 상세 에러 정보 출력
    if (error && typeof error === 'object' && 'body' in error) {
      const typedError = error as { status?: number; body?: { detail?: unknown }; message?: string };
      console.error('Error details:', {
        status: typedError.status,
        body: typedError.body,
        message: typedError.message
      });
      
      // 422 에러의 경우 더 자세한 정보 출력
      if (typedError?.status === 422 && typedError?.body?.detail) {
        console.error('Validation errors:', JSON.stringify(typedError.body.detail, null, 2));
      }
    }
    
    // 401 에러의 경우 더 명확한 메시지
    const errorWithStatus = error as { status?: number };
    if (errorWithStatus?.status === 401) {
      throw new Error('fal.ai API authentication failed. Please check your API key.');
    }
    
    throw new Error(
      error instanceof Error 
        ? error.message 
        : '비디오 생성 중 오류가 발생했습니다.'
    );
  }
}

/**
 * 여러 효과 프롬프트를 하나로 결합합니다.
 * 각 프롬프트는 마침표(.)로 구분합니다.
 */
export function combineEffectPrompts(
  effects: Array<{ prompt: string; name?: string }>,
  basePrompt?: string
): string {
  const prompts: string[] = [];
  
  // 사용자 입력 프롬프트 추가
  if (basePrompt && basePrompt.trim()) {
    prompts.push(basePrompt.trim());
  }
  
  // 선택된 효과들의 프롬프트 추가
  effects.forEach(effect => {
    if (effect.prompt && effect.prompt.trim()) {
      prompts.push(effect.prompt.trim());
    }
  });
  
  // 마침표로 구분하여 결합
  return prompts.join('. ');
}

export interface SoundGenerationParams {
  text: string;
  duration_seconds?: number;
  prompt_influence?: number;
}

export interface SoundGenerationResult {
  audioUrl: string;
  requestId?: string;
}

/**
 * fal.ai ElevenLabs를 사용하여 AI 사운드를 생성합니다.
 */
export async function generateSound({
  text,
  duration_seconds,
  prompt_influence = 0.3
}: SoundGenerationParams): Promise<SoundGenerationResult> {
  const endpoint = "fal-ai/elevenlabs/sound-effects";
  
  try {
    // fal.ai API 호출 (subscribe 방식)
    const result = await fal.subscribe(endpoint, {
      input: {
        text,
        duration_seconds,
        prompt_influence
      },
      logs: true,
      onQueueUpdate: (update) => {
        // Status update handling
        if (update.status === "IN_PROGRESS" || update.status === "IN_QUEUE") {
          // Silent processing
        }
      }
    }) as { audio?: { url?: string }; requestId?: string };

    // 응답 구조 확인
    const audioUrl = result?.audio?.url;
    
    if (!audioUrl) {
      console.error('Sound generation result structure:', {
        hasAudio: !!result?.audio,
        keys: Object.keys(result || {}),
        result: result
      });
      throw new Error('오디오 URL을 찾을 수 없습니다.');
    }

    return {
      audioUrl,
      requestId: result?.requestId || Date.now().toString()
    };
  } catch (error) {
    console.error('Sound generation error:', error);
    
    // 401 에러의 경우 더 명확한 메시지
    const errorWithStatus = error as { status?: number };
    if (errorWithStatus?.status === 401) {
      throw new Error('fal.ai API authentication failed. Please check your API key.');
    }
    
    throw new Error(
      error instanceof Error 
        ? error.message 
        : '사운드 생성 중 오류가 발생했습니다.'
    );
  }
}