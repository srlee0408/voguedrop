import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/shared/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contentHash = searchParams.get('hash');
    
    if (!contentHash) {
      return NextResponse.json(
        { error: 'Content hash is required' },
        { status: 400 }
      );
    }

    // 인증 확인
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // content_hash로 기존 완료된 렌더링 확인
    const { data, error } = await supabase
      .from('video_renders')
      .select('render_id, output_url, status, created_at')
      .eq('user_id', user.id)
      .eq('content_hash', contentHash)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(); // single() 대신 maybeSingle() 사용 (없어도 에러 안남)

    if (error) {
      console.error('Error checking render:', error);
      throw error;
    }

    // 렌더링이 있고 output_url이 있는 경우
    if (data && data.output_url) {
      // Supabase Storage URL 확인 (필요시 S3에서 마이그레이션)
      const finalUrl = data.output_url;
      
      // S3 URL인 경우 Supabase Storage 확인
      if (data.output_url.includes('amazonaws.com')) {
        // 향후 S3 → Supabase 마이그레이션 로직 추가 가능
        // 현재는 S3 URL 그대로 사용
      }
      
      return NextResponse.json({
        exists: true,
        renderId: data.render_id,
        outputUrl: finalUrl,
        createdAt: data.created_at
      });
    }

    // 렌더링이 없는 경우
    return NextResponse.json({
      exists: false,
      outputUrl: null
    });

  } catch (error) {
    console.error('Check render error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check render',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}