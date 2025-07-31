import { NextRequest, NextResponse } from 'next/server';
import { generateVideo, combineEffectPrompts } from '@/lib/fal-ai';
import {
  checkDailyGenerationLimit
} from '@/lib/db/video-generations';
import type { EffectTemplate } from '@/types/canvas';
import { uploadBase64Image } from '@/lib/supabase/storage';
import { createClient } from '@/lib/supabase/server';

export const maxDuration = 60; // Vercel 함수 타임아웃 60초

interface GenerateVideoRequest {
  imageUrl: string;
  selectedEffects: EffectTemplate[];
  basePrompt?: string;
  modelType?: 'seedance' | 'hailo';
  userId?: string;
  duration?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Supabase 클라이언트 생성 및 인증 확인
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }
    
    // 1. 요청 데이터 검증
    const body: GenerateVideoRequest = await request.json();
    const { 
      imageUrl, 
      selectedEffects = [], 
      basePrompt = '',
      duration = '5'
    } = body;
    
    // 로그인한 사용자의 ID 사용
    const userId = user.id;

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

    // 3.5. base64 이미지를 Supabase Storage에 업로드
    let finalImageUrl = imageUrl;
    if (imageUrl.startsWith('data:')) {
      try {
        finalImageUrl = await uploadBase64Image(imageUrl, userId);
        
        // CDN 전파를 위한 대기 및 접근성 확인
        console.log('Waiting for CDN propagation and checking accessibility...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // 이미지 접근 가능 여부 확인
        try {
          const checkResponse = await fetch(finalImageUrl, { method: 'HEAD' });
          console.log('Image accessibility check:', {
            url: finalImageUrl,
            status: checkResponse.status,
            ok: checkResponse.ok
          });
        } catch (checkError) {
          console.error('Image accessibility check failed:', checkError);
        }
        
      } catch {
        return NextResponse.json(
          { error: '이미지 업로드에 실패했습니다.' },
          { status: 500 }
        );
      }
    }

    // 4. 두 모델에 대한 DB 레코드 생성
    // RLS 정책을 위해 인증된 supabase 클라이언트로 직접 삽입
    const models: Array<'seedance' | 'hailo'> = ['seedance', 'hailo'];
    const generations = await Promise.all(
      models.map(async (model) => {
        const { data, error } = await supabase
          .from('video_generations')
          .insert({
            user_id: userId,
            status: 'pending',
            input_image_url: finalImageUrl,
            prompt: combinedPrompt,
            selected_effects: selectedEffects.map(e => ({
              id: e.id,
              name: e.name,
              prompt: e.prompt
            })),
            model_type: model
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating video generation:', error);
          throw new Error('비디오 생성 요청을 저장하는데 실패했습니다.');
        }

        return data;
      })
    );

    // 5. 상태를 processing으로 업데이트
    await Promise.all(
      generations.map(async (gen) => {
        const { error } = await supabase
          .from('video_generations')
          .update({ 
            status: 'processing',
            updated_at: new Date().toISOString()
          })
          .eq('id', gen.id);
        
        if (error) {
          console.error('Error updating video generation:', error);
        }
      })
    );

    // 6. 두 모델로 시간차를 두고 비디오 생성
    const videoGenerations = await Promise.allSettled(
      models.map(async (model, index) => {
        try {
          // 두 번째 모델(Hailo)은 3초 대기 후 실행
          if (index === 1) {
            console.log('Waiting 3 seconds before calling Hailo...');
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
          
          // 🚀 fal.ai API 호출 (/lib/fal-ai.ts → generateVideo)
          const { videoUrl } = await generateVideo({
            imageUrl: finalImageUrl,
            prompt: combinedPrompt,
            modelType: model,
            duration: duration || '6'  // 두 모델 모두 사용자가 선택한 duration 사용
          });

          // 성공시 DB 업데이트
          const { data: updatedGeneration, error: updateError } = await supabase
            .from('video_generations')
            .update({
              status: 'completed',
              output_video_url: videoUrl,
              updated_at: new Date().toISOString()
            })
            .eq('id', generations[index].id)
            .select()
            .single();
          
          if (updateError) {
            console.error('Error updating video generation:', updateError);
            throw updateError;
          }

          return {
            success: true,
            generationId: generations[index].id,
            videoUrl,
            modelType: model,
            generation: updatedGeneration
          };
        } catch (error) {
          // 실패시 DB 업데이트
          const { error: updateError } = await supabase
            .from('video_generations')
            .update({
              status: 'failed',
              error_message: error instanceof Error ? error.message : '비디오 생성 실패',
              updated_at: new Date().toISOString()
            })
            .eq('id', generations[index].id);
          
          if (updateError) {
            console.error('Error updating failed generation:', updateError);
          }

          throw error;
        }
      })
    );

    // 7. 결과 처리
    const results = videoGenerations.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          success: false,
          generationId: generations[index].id,
          modelType: models[index],
          error: result.reason?.message || '비디오 생성 실패'
        };
      }
    });

    // 최소 하나 이상 성공했는지 확인
    const successfulResults = results.filter(r => r.success);
    if (successfulResults.length === 0) {
      return NextResponse.json(
        { error: '모든 모델에서 비디오 생성에 실패했습니다.', results },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      results
    });


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