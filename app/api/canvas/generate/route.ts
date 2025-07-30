import { NextRequest, NextResponse } from 'next/server';
import { generateVideo, combineEffectPrompts } from '@/lib/fal-ai';
import {
  createVideoGeneration,
  updateVideoGeneration,
  checkDailyGenerationLimit
} from '@/lib/db/video-generations';
import type { EffectTemplate } from '@/types/canvas';
import { getOrCreateSessionId } from '@/lib/utils/session.server';

export const maxDuration = 60; // Vercel 함수 타임아웃 60초

interface GenerateVideoRequest {
  imageUrl: string;
  selectedEffects: EffectTemplate[];
  basePrompt?: string;
  modelType?: 'seedance' | 'hailo';
  userId?: string;
}

export async function POST(request: NextRequest) {
  try {
    // 1. 요청 데이터 검증
    const body: GenerateVideoRequest = await request.json();
    const { 
      imageUrl, 
      selectedEffects = [], 
      basePrompt = '',
      modelType = 'seedance'
    } = body;
    
    // 세션 ID 가져오기
    const userId = await getOrCreateSessionId();

    if (!imageUrl) {
      return NextResponse.json(
        { error: '이미지 URL이 필요합니다.' },
        { status: 400 }
      );
    }

    // 2. 일일 생성 한도 확인 (옵션)
    const dailyLimit = parseInt(process.env.DAILY_GENERATION_LIMIT || '100');
    const { allowed, count } = await checkDailyGenerationLimit(userId, dailyLimit);
    
    if (!allowed) {
      return NextResponse.json(
        { 
          error: `일일 생성 한도(${dailyLimit}개)를 초과했습니다.`,
          dailyCount: count 
        },
        { status: 429 }
      );
    }

    // 3. 효과 프롬프트 결합
    const combinedPrompt = combineEffectPrompts(selectedEffects, basePrompt);
    
    if (!combinedPrompt) {
      return NextResponse.json(
        { error: '최소 하나의 효과나 프롬프트가 필요합니다.' },
        { status: 400 }
      );
    }

    // 4. DB에 생성 요청 저장 (pending 상태)
    const generation = await createVideoGeneration({
      userId,
      inputImageUrl: imageUrl,
      prompt: combinedPrompt,
      selectedEffects: selectedEffects.map(e => ({
        id: e.id,
        name: e.name,
        prompt: e.prompt
      })),
      modelType
    });

    // 5. 상태를 processing으로 업데이트
    await updateVideoGeneration(generation.id, {
      status: 'processing'
    });

    // 6. fal.ai 비디오 생성 호출
    try {
      const { videoUrl } = await generateVideo({
        imageUrl,
        prompt: combinedPrompt,
        modelType,
        duration: modelType === 'seedance' ? '3' : '6'
      });

      // 7. 성공시 DB 업데이트
      const updatedGeneration = await updateVideoGeneration(generation.id, {
        status: 'completed',
        outputVideoUrl: videoUrl
      });

      return NextResponse.json({
        success: true,
        generationId: generation.id,
        videoUrl,
        generation: updatedGeneration
      });

    } catch (falError) {
      // 8. fal.ai 에러 처리
      console.error('fal.ai generation error:', falError);
      
      const errorMessage = falError instanceof Error 
        ? falError.message 
        : '비디오 생성 중 오류가 발생했습니다.';

      await updateVideoGeneration(generation.id, {
        status: 'failed',
        errorMessage
      });

      return NextResponse.json(
        { 
          error: errorMessage,
          generationId: generation.id
        },
        { status: 500 }
      );
    }

  } catch (error) {
    // 9. 일반 에러 처리
    console.error('API error:', error);
    
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

// 생성 상태 확인 엔드포인트
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const generationId = searchParams.get('id');

    if (!generationId) {
      return NextResponse.json(
        { error: '생성 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    // Supabase에서 생성 상태 조회
    const { supabase } = await import('@/lib/supabase');
    const { data, error } = await supabase
      .from('video_generations')
      .select('*')
      .eq('id', generationId)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: '생성 정보를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      generation: data
    });

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}