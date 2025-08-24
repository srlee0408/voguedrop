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

    // URL 파라미터 가져오기 (성능 최적화를 위한 추가 파라미터 지원)
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50); // 최대 50개로 제한
    const type = searchParams.get('type') || 'all'; // 타입 필터: all, favorites, regular, clips, projects, uploads
    const cursor = searchParams.get('cursor'); // 페이지네이션 커서 (created_at 기준)
    const countsOnly = searchParams.get('counts_only') === 'true'; // 카운트만 조회
    const prefetch = searchParams.get('prefetch') === 'true'; // 프리페칭 모드

    // 카운트만 요청하는 경우
    if (countsOnly) {
      const [favoritesCount, regularCount, projectsCount, uploadsCount] = await Promise.all([
        supabase
          .from('video_generations')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .eq('is_favorite', true)
          .not('output_video_url', 'is', null),
        supabase
          .from('video_generations')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .eq('is_favorite', false)
          .not('output_video_url', 'is', null),
        supabase
          .from('project_saves')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id),
        supabase
          .from('user_uploaded_videos')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_deleted', false)
      ]);

      return NextResponse.json({
        counts: {
          favorites: favoritesCount.count || 0,
          regular: regularCount.count || 0,
          clips: (favoritesCount.count || 0) + (regularCount.count || 0),
          projects: projectsCount.count || 0,
          uploads: uploadsCount.count || 0
        }
      });
    }

    // 1. video_generations 가져오기 (clips) - UUID 기반 및 타입 필터 지원
    let videosQuery = supabase
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
      .not('output_video_url', 'is', null);

    // 타입 필터 적용
    if (type === 'favorites') {
      videosQuery = videosQuery.eq('is_favorite', true);
    } else if (type === 'regular') {
      // 일반 클립 섹션에서는 모든 클립 표시 (즐겨찾기 포함)
      // 필터링하지 않음
    }

    // 커서 기반 페이지네이션
    if (cursor) {
      videosQuery = videosQuery.lt('created_at', cursor);
    }

    // 정렬 및 제한
    if (type === 'favorites') {
      videosQuery = videosQuery.order('created_at', { ascending: false });
    } else {
      // 일반 클립의 경우 시간순으로만 정렬 (즐겨찾기 우선 정렬 제거)
      videosQuery = videosQuery.order('created_at', { ascending: false });
    }

    const { data: videos, error: videosError } = await videosQuery.limit(limit);

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
      selected_effects: video.selected_effects?.map((effect: { id: string; name: string }) => ({
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

    // 페이지네이션 정보 계산 (무한 스크롤 최적화)
    const hasNextPage = sanitizedVideos.length === limit;
    const nextCursor = hasNextPage && sanitizedVideos.length > 0 
      ? sanitizedVideos[sanitizedVideos.length - 1].created_at 
      : undefined;

    // 응답 데이터 구성 (타입별 최적화)
    const responseData = {
      // 기존 필드들 (backward compatibility)
      videos: sanitizedVideos,
      clips: sanitizedVideos,
      projects: sanitizedProjects,
      uploads: sanitizedUploads,
      count: sanitizedVideos.length,
      
      // 새로운 페이지네이션 필드들 (무한 스크롤 최적화)
      data: {
        clips: sanitizedVideos,
        projects: sanitizedProjects,
        uploads: sanitizedUploads
      },
      counts: {
        clips: sanitizedVideos.length,
        projects: sanitizedProjects.length,
        uploads: sanitizedUploads.length
      },
      pagination: {
        hasNextPage,
        nextCursor,
        limit,
        type,
        isPrefetch: prefetch
      },
      
      // 성능 메트릭 (개발/디버깅용)
      performance: {
        fetchedAt: new Date().toISOString(),
        itemCount: sanitizedVideos.length,
        hasMore: hasNextPage
      }
    };

    // 캐싱 헤더 설정 (성능 최적화)
    const headers = new Headers({
      'Content-Type': 'application/json',
    });
    
    // 프리페칭의 경우 더 긴 캐시 시간 적용
    if (prefetch || type === 'favorites') {
      headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    } else {
      headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
    }
    
    // ETag 추가 (데이터 무결성)
    const etag = `"${user.id}-${type}-${cursor || 'initial'}-${limit}"`;
    headers.set('ETag', etag);

    return new NextResponse(JSON.stringify(responseData), { 
      status: 200, 
      headers 
    });

  } catch {
    // Library API error
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}