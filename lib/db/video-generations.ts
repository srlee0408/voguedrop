import { supabase } from '@/lib/supabase';

export interface VideoGeneration {
  id: number;
  user_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  input_image_url: string;
  output_video_url?: string;
  prompt: string;
  selected_effects: Array<{
    id: number;
    name: string;
    prompt: string;
  }>;
  model_type: 'seedance' | 'hailo';
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateVideoGenerationParams {
  userId?: string;
  inputImageUrl: string;
  prompt: string;
  selectedEffects: Array<{
    id: number;
    name: string;
    prompt: string;
  }>;
  modelType: 'seedance' | 'hailo';
}

/**
 * 새로운 비디오 생성 요청을 DB에 저장합니다.
 */
export async function createVideoGeneration({
  userId = 'anonymous',
  inputImageUrl,
  prompt,
  selectedEffects,
  modelType
}: CreateVideoGenerationParams): Promise<VideoGeneration> {
  const { data, error } = await supabase
    .from('video_generations')
    .insert({
      user_id: userId,
      status: 'pending',
      input_image_url: inputImageUrl,
      prompt,
      selected_effects: selectedEffects,
      model_type: modelType
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating video generation:', error);
    throw new Error('비디오 생성 요청을 저장하는데 실패했습니다.');
  }

  return data;
}

/**
 * 비디오 생성 상태를 업데이트합니다.
 */
export async function updateVideoGeneration(
  generationId: number,
  updates: {
    status?: VideoGeneration['status'];
    outputVideoUrl?: string;
    errorMessage?: string;
  }
): Promise<VideoGeneration> {
  const updateData: Record<string, string> = {
    updated_at: new Date().toISOString()
  };

  if (updates.status) {
    updateData.status = updates.status;
  }
  if (updates.outputVideoUrl) {
    updateData.output_video_url = updates.outputVideoUrl;
  }
  if (updates.errorMessage) {
    updateData.error_message = updates.errorMessage;
  }

  const { data, error } = await supabase
    .from('video_generations')
    .update(updateData)
    .eq('id', generationId)
    .select()
    .single();

  if (error) {
    console.error('Error updating video generation:', error);
    throw new Error('비디오 생성 상태 업데이트에 실패했습니다.');
  }

  return data;
}

/**
 * 사용자의 최근 비디오 생성 기록을 가져옵니다.
 */
export async function getUserVideoGenerations(
  userId: string,
  limit: number = 10
): Promise<VideoGeneration[]> {
  const { data, error } = await supabase
    .from('video_generations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching user video generations:', error);
    throw new Error('비디오 생성 기록을 불러오는데 실패했습니다.');
  }

  return data || [];
}

/**
 * 일일 생성 횟수를 확인합니다.
 */
export async function checkDailyGenerationLimit(
  userId: string,
  limit: number = 100
): Promise<{ allowed: boolean; count: number }> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { count, error } = await supabase
    .from('video_generations')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', today.toISOString());

  if (error) {
    console.error('Error checking daily limit:', error);
    // 에러 발생시 기본적으로 허용
    return { allowed: true, count: 0 };
  }

  return {
    allowed: (count || 0) < limit,
    count: count || 0
  };
}