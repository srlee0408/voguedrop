import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/infrastructure/supabase/server';

interface ProjectListItem {
  id: string; // number에서 string으로 변경
  project_name: string;
  thumbnail_url: string | null;
  latest_video_url: string | null;
  updated_at: string;
  duration_frames?: number;
}

// GET: 사용자의 모든 프로젝트 목록 조회
export async function GET() {
  try {
    // 사용자 인증 확인
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // 사용자의 모든 프로젝트 조회
    const { data: projects, error } = await supabase
      .from('project_saves')
      .select(`
        id,
        project_name,
        thumbnail_url,
        latest_video_url,
        updated_at,
        content_snapshot
      `)
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });
    
    if (error) {
      throw error;
    }
    
    // content_snapshot에서 duration_frames 추출
    const projectList: ProjectListItem[] = (projects || []).map(project => ({
      id: project.id,
      project_name: project.project_name,
      thumbnail_url: project.thumbnail_url,
      latest_video_url: project.latest_video_url,
      updated_at: project.updated_at,
      duration_frames: project.content_snapshot?.duration_frames
    }));
    
    return NextResponse.json({
      success: true,
      projects: projectList,
      count: projectList.length
    });
    
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Failed to fetch projects',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE: 프로젝트 삭제 (선택적 기능)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId'); // projectName에서 projectId로 변경
    
    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }
    
    // 사용자 인증 확인
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // 프로젝트 삭제 (사용자 소유 확인은 RLS가 처리)
    const { error } = await supabase
      .from('project_saves')
      .delete()
      .eq('user_id', user.id)
      .eq('id', projectId);
    
    if (error) {
      throw error;
    }
    
    return NextResponse.json({
      success: true,
      message: 'Project deleted successfully'
    });
    
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Failed to delete project',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}