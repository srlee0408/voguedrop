import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/shared/lib/supabase/server';

/**
 * Library 데이터 정합성 검증 API
 * 클라이언트의 캐시된 데이터와 실제 DB 데이터 비교
 */
export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { clipIds, expectedCount } = body;

    // 실제 DB에서 사용자의 완료된 클립 수 조회
    const { count: actualTotalCount, error: countError } = await supabase
      .from('video_generations')
      .select('id', { count: 'exact' })
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .not('output_video_url', 'is', null);

    if (countError) {
      return NextResponse.json({
        error: 'Failed to get total count',
        details: countError.message
      }, { status: 500 });
    }

    // 제공된 클립 ID들이 실제로 DB에 존재하는지 확인
    let missingClips: string[] = [];
    let dataIntegrityIssues: Array<{ id: string; output_video_url: string | null }> = [];

    if (clipIds && clipIds.length > 0) {
      const { data: existingClips, error: clipsError } = await supabase
        .from('video_generations')
        .select('id, output_video_url, input_image_url, created_at, is_favorite, model_type')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .in('id', clipIds);

      if (clipsError) {
        return NextResponse.json({
          error: 'Failed to verify clips',
          details: clipsError.message
        }, { status: 500 });
      }

      // 누락된 클립 찾기
      const existingClipIds = existingClips?.map(clip => clip.id.toString()) || [];
      missingClips = clipIds.filter((id: string) => !existingClipIds.includes(id));

      // 데이터 무결성 이슈 찾기 (비디오 URL이 없는 클립 등)
      dataIntegrityIssues = existingClips?.filter(clip => !clip.output_video_url) || [];
    }

    return NextResponse.json({
      totalClips: actualTotalCount || 0,
      expectedCount: expectedCount || 0,
      countMismatch: (actualTotalCount || 0) !== (expectedCount || 0),
      missingClips,
      dataIntegrityIssues: dataIntegrityIssues.map(issue => ({
        id: issue.id,
        issue: 'missing_video_url'
      })),
      isHealthy: missingClips.length === 0 && dataIntegrityIssues.length === 0 && ((actualTotalCount || 0) === (expectedCount || 0))
    });

  } catch {
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}