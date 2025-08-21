import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/shared/lib/supabase/server';
import { createServiceClient } from '@/shared/lib/supabase/service';
import { requireAuth } from '@/lib/api/auth';

export async function GET(request: NextRequest) {
  try {
    // 사용자 인증 확인 (보안 유틸리티 사용)
    const { user, error: authError } = await requireAuth(request);
    if (authError) {
      return authError;
    }

    if (!user) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }
    
    const supabase = await createClient();

    // URL 파라미터 가져오기
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    // 1. video_generations 가져오기 (clips)
    const { data: videos, error: videosError } = await supabase
      .from('video_generations')
      .select(`
        id,
        job_id,
        status,
        input_image_url,
        output_video_url,
        created_at,
        is_favorite,
        selected_effects
      `)
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .not('output_video_url', 'is', null)
      .order('is_favorite', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (videosError) {
      console.error('Error fetching videos:', videosError);
      return NextResponse.json(
        { error: '비디오 목록을 불러오는데 실패했습니다.' },
        { status: 500 }
      );
    }

    // 2. project_saves 가져오기 (projects)
    const { data: projects, error: projectsError } = await supabase
      .from('project_saves')
      .select(`
        id,
        project_name,
        updated_at,
        latest_video_url,
        latest_render_id,
        thumbnail_url,
        content_snapshot,
        video_renders!project_saves_latest_render_id_fkey (
          render_id,
          output_url,
          thumbnail_url,
          status
        )
      `)
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (projectsError) {
      console.error('Error fetching projects:', projectsError);
      // 프로젝트 조회 실패는 치명적이지 않으므로 빈 배열로 처리
    }

    // 3. user_uploaded_videos 가져오기 (uploads)
    const { data: uploads, error: uploadsError } = await supabase
      .from('user_uploaded_videos')
      .select(`
        id,
        user_id,
        file_name,
        storage_path,
        file_size,
        duration,
        aspect_ratio,
        thumbnail_url,
        metadata,
        uploaded_at
      `)
      .eq('user_id', user.id)
      .eq('is_deleted', false)
      .order('uploaded_at', { ascending: false })
      .limit(limit);

    if (uploadsError) {
      console.error('Error fetching uploads:', uploadsError);
      // 업로드 조회 실패는 치명적이지 않으므로 빈 배열로 처리
    }

    // Storage URL은 공개 정보이므로 Service Client 사용이 필수
    // 하지만 위에서 이미 user_id로 필터링된 데이터만 처리하므로 안전
    const serviceSupabase = createServiceClient();
    const sanitizedUploads = (uploads || []).map(upload => {
      const { data: { publicUrl } } = serviceSupabase.storage
        .from('user-uploads')
        .getPublicUrl(upload.storage_path);
      
      return {
        ...upload,
        url: publicUrl
      };
    });

    // selected_effects에서 name만 추출하여 반환
    const sanitizedVideos = (videos || []).map(video => ({
      id: video.id,
      job_id: video.job_id,
      status: video.status,
      input_image_url: video.input_image_url,
      output_video_url: video.output_video_url,
      created_at: video.created_at,
      is_favorite: video.is_favorite,
      selected_effects: video.selected_effects?.map((effect: { id: number; name: string }) => ({
        id: effect.id,
        name: effect.name
      })) || []
    }));

    // project_saves 데이터 정리
    const sanitizedProjects = (projects || []).map(project => {
      // video_renders는 foreign key relation으로 배열 또는 단일 객체일 수 있음
      const videoRender = Array.isArray(project.video_renders) 
        ? project.video_renders[0] 
        : project.video_renders;
        
      return {
        id: project.id,
        project_name: project.project_name,
        updated_at: project.updated_at,
        latest_video_url: project.latest_video_url,
        thumbnail_url: project.thumbnail_url, // 프로젝트 썸네일 URL 추가
        latest_render: videoRender ? {
          render_id: videoRender.render_id,
          output_url: videoRender.output_url,
          thumbnail_url: videoRender.thumbnail_url,
          status: videoRender.status
        } : undefined,
        content_snapshot: project.content_snapshot ? {
          aspect_ratio: project.content_snapshot.aspect_ratio,
          duration_frames: project.content_snapshot.duration_frames
        } : undefined
      };
    });

    return NextResponse.json({
      videos: sanitizedVideos,  // backward compatibility
      clips: sanitizedVideos,
      projects: sanitizedProjects,
      uploads: sanitizedUploads,
      counts: {
        clips: sanitizedVideos.length,
        projects: sanitizedProjects.length,
        uploads: sanitizedUploads.length
      },
      count: sanitizedVideos.length  // backward compatibility
    });

  } catch {
    // Library API error
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}