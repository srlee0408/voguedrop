import { NextResponse } from 'next/server';
import { createClient } from '@/infrastructure/supabase/server';

interface SoundGeneration {
  id: string;
  title: string | null;
  prompt: string;
  output_audio_url: string | null;
  duration_seconds: number;
  created_at: string;
  generation_group_id: string | null;
  variation_number: number | null;
  generation_type: string | null;
}

interface GroupedSoundHistory {
  groupId: string;
  prompt: string;
  title: string | null;
  createdAt: string;
  generationType: string | null;
  variations: {
    id: string;
    variationNumber: number;
    url: string;
    duration: number;
  }[];
}

export async function GET(request: Request) {
  try {
    // URL 파라미터에서 generation_type 가져오기
    const { searchParams } = new URL(request.url);
    const typeFilter = searchParams.get('type'); // 'all' | 'sound_effect' | 'music' | 'from_video'
    
    // Supabase 클라이언트 생성 및 인증 확인
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }
    
    // 최근 완료된 사운드 생성 기록 조회 (그룹화를 위해 더 많이 가져옴)
    // prompt 정보도 포함하여 그룹화
    let query = supabase
      .from('sound_generations')
      .select('id, title, prompt, output_audio_url, duration_seconds, created_at, generation_group_id, variation_number, generation_type')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .not('output_audio_url', 'is', null);
    
    // generation_type 필터 적용
    if (typeFilter && typeFilter !== 'all') {
      query = query.eq('generation_type', typeFilter);
    }
    
    const { data: soundHistory, error } = await query
      .order('created_at', { ascending: false })
      .limit(120); // 30개 그룹을 만들기 위해 더 많이 가져옴
    
    if (error) {
      console.error('Failed to fetch sound history:', error);
      return NextResponse.json(
        { error: '사운드 기록을 불러오는데 실패했습니다.' },
        { status: 500 }
      );
    }
    
    // 그룹화 처리
    const groupedMap = new Map<string, GroupedSoundHistory>();
    
    (soundHistory as SoundGeneration[] || []).forEach(sound => {
      const groupKey = sound.generation_group_id || `single-${sound.id}`;
      
      if (!groupedMap.has(groupKey)) {
        groupedMap.set(groupKey, {
          groupId: groupKey,
          prompt: sound.prompt,
          title: sound.title,
          createdAt: sound.created_at,
          generationType: sound.generation_type,
          variations: []
        });
      }
      
      const group = groupedMap.get(groupKey)!;
      group.variations.push({
        id: `history-${sound.id}`,
        variationNumber: sound.variation_number || 1,
        url: sound.output_audio_url!,
        duration: Number(sound.duration_seconds)
      });
    });
    
    // Map을 배열로 변환하고 정렬
    const groupedHistory = Array.from(groupedMap.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 30); // 최근 30개 그룹만
    
    // 각 그룹 내의 variations를 variation_number 순으로 정렬
    groupedHistory.forEach(group => {
      group.variations.sort((a, b) => a.variationNumber - b.variationNumber);
    });
    
    return NextResponse.json({
      success: true,
      groups: groupedHistory
    });
    
  } catch (error) {
    console.error('Error fetching sound history:', error);
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