import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { requireAuth } from '@/lib/api/auth';
import crypto from 'crypto';

interface SaveRequest {
  projectName: string;
  videoClips: unknown[];
  textClips: unknown[];
  soundClips: unknown[];
  aspectRatio: '9:16' | '1:1' | '16:9';
  durationInFrames: number;
  renderId?: string;
  renderOutputUrl?: string;
}

// 안전한 파일명 생성 함수
function sanitizeFileName(fileName: string): string {
  // 특수문자 제거, 공백을 언더스코어로 치환
  return fileName
    .replace(/[^a-zA-Z0-9가-힣.\-_]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_{2,}/g, '_')
    .slice(0, 100); // 최대 100자로 제한
}

// 컨텐츠 해시 생성 함수
function generateContentHash(data: {
  videoClips: unknown[];
  textClips: unknown[];
  soundClips: unknown[];
  aspectRatio: string;
}): string {
  // 비교에 필요한 핵심 데이터만 추출
  const essentialData = {
    aspectRatio: data.aspectRatio,
    videoClips: (data.videoClips as unknown[]).map((clip: unknown) => {
      const c = clip as Record<string, unknown>;
      return {
        url: c.url,
        position: c.position,
        duration: c.duration,
        startTime: c.startTime || 0,
        endTime: c.endTime
      };
    }).sort((a, b) => (a.position as number) - (b.position as number)),
    textClips: (data.textClips as unknown[]).map((text: unknown) => {
      const t = text as Record<string, unknown>;
      return {
        content: t.content,
        position: t.position,
        duration: t.duration,
        style: t.style,
        effect: t.effect
      };
    }).sort((a, b) => (a.position as number) - (b.position as number)),
    soundClips: (data.soundClips as unknown[]).map((sound: unknown) => {
      const s = sound as Record<string, unknown>;
      return {
        url: s.url,
        position: s.position,
        duration: s.duration,
        volume: s.volume,
        startTime: s.startTime || 0
      };
    }).sort((a, b) => (a.position as number) - (b.position as number))
  };

  // SHA256 해시 생성
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(essentialData))
    .digest('hex');
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body: SaveRequest = await request.json();
    const {
      projectName,
      videoClips,
      textClips,
      soundClips,
      aspectRatio,
      durationInFrames
    } = body;
    
    const { renderId, renderOutputUrl } = body;

    // 컨텐츠 해시 생성
    const contentHash = generateContentHash({
      videoClips,
      textClips,
      soundClips,
      aspectRatio
    });

    // 첫 번째 비디오 클립의 썸네일 URL 추출
    let thumbnailUrl: string | null = null;
    if (videoClips && videoClips.length > 0) {
      const firstClip = videoClips[0] as Record<string, unknown>;
      // thumbnail이 있으면 사용, 없으면 null
      thumbnailUrl = (firstClip.thumbnail as string) || null;
      console.log('Extracted thumbnail from first clip:', thumbnailUrl);
    }

    // 컨텐츠 스냅샷 생성
    const contentSnapshot = {
      version: '1.0',
      aspect_ratio: aspectRatio,
      duration_frames: durationInFrames,
      video_clips: videoClips,
      text_clips: textClips,
      sound_clips: soundClips,
      content_hash: contentHash
    };

    // render_id가 제공된 경우, video_renders 테이블에 존재하는지 확인
    let validRenderId: string | null = null;
    if (renderId) {
      const { data: renderExists } = await supabase
        .from('video_renders')
        .select('render_id')
        .eq('render_id', renderId)
        .single();
      
      if (renderExists) {
        validRenderId = renderId;
      } else {
        console.warn(`Render ID ${renderId} not found in video_renders table`);
      }
    }

    // UPSERT 방식으로 단순화 - 있으면 UPDATE, 없으면 INSERT
    const { data: savedProject, error: saveError } = await supabase
      .from('project_saves')
      .upsert({
        user_id: user.id,
        project_name: projectName,
        latest_render_id: validRenderId || null,
        latest_video_url: null, // 렌더링 후 업데이트 예정
        thumbnail_url: thumbnailUrl, // 첫 번째 클립의 썸네일 저장
        content_snapshot: contentSnapshot,
        content_hash: contentHash,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,project_name', // 복합 유니크 키
        ignoreDuplicates: false // 항상 덮어쓰기
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving project:', saveError);
      throw saveError;
    }

    // validRenderId가 있으면 video_renders 업데이트
    if (validRenderId) {
      await supabase
        .from('video_renders')
        .update({ project_save_id: savedProject.id })
        .eq('render_id', validRenderId);
    }

    // Supabase Storage에 비디오와 메타데이터 저장
    let supabaseVideoUrl: string | null = null;
    
    if (renderOutputUrl) {
      try {
        // 1. S3에서 비디오 다운로드
        console.log('Downloading video from S3:', renderOutputUrl);
        const videoResponse = await fetch(renderOutputUrl);
        if (!videoResponse.ok) {
          throw new Error('Failed to download video from S3');
        }
        
        const videoBlob = await videoResponse.blob();
        
        // 파일 크기 검증 (최대 100MB)
        const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
        if (videoBlob.size > MAX_FILE_SIZE) {
          throw new Error(`Video file too large: ${(videoBlob.size / 1024 / 1024).toFixed(2)}MB (max: 100MB)`);
        }
        
        const videoFileName = `video-${Date.now()}.mp4`;
        const safeProjectName = sanitizeFileName(projectName);
        const videoPath = `video-projects/${user.id}/${safeProjectName}/${videoFileName}`;
        
        // 2. Service Client를 사용하여 Supabase Storage에 비디오 업로드
        // 사용자 인증은 이미 위에서 확인했으므로, Service Client로 RLS 우회
        console.log('Uploading video to Supabase Storage with Service Client:', videoPath);
        const serviceSupabase = createServiceClient();
        
        const { error: videoError } = await serviceSupabase.storage
          .from('user-uploads')
          .upload(videoPath, videoBlob, {
            contentType: 'video/mp4',
            upsert: true
          });

        if (videoError) {
          console.error('Storage upload error details:', {
            error: videoError,
            bucket: 'user-uploads',
            path: videoPath,
            fileSize: videoBlob.size,
            contentType: 'video/mp4'
          });
          throw new Error(`Storage upload failed: ${videoError.message || 'Unknown error'}`);
        }

        // 3. 비디오 공개 URL 가져오기 (Service Client 사용)
        const { data: { publicUrl } } = serviceSupabase.storage
          .from('user-uploads')
          .getPublicUrl(videoPath);
        
        supabaseVideoUrl = publicUrl;
        console.log('Video uploaded to Supabase:', supabaseVideoUrl);

        // 4. 메타데이터 저장 (Service Client 사용)
        const metadataPath = `video-projects/${user.id}/${safeProjectName}/metadata.json`;
        const { error: metadataError } = await serviceSupabase.storage
          .from('user-uploads')
          .upload(metadataPath, JSON.stringify({
            projectName,
            savedAt: new Date().toISOString(),
            s3Url: renderOutputUrl,
            supabaseUrl: supabaseVideoUrl,
            contentSnapshot
          }), {
            contentType: 'application/json',
            upsert: true
          });

        if (metadataError) {
          console.error('Error uploading metadata:', metadataError);
          // 메타데이터 업로드 실패는 치명적이지 않으므로 계속 진행
        }

        // 5. project_saves 테이블 업데이트 (user_id 조건 추가)
        await serviceSupabase
          .from('project_saves')
          .update({ 
            latest_render_id: validRenderId,
            latest_video_url: supabaseVideoUrl,  // latest_video_url 코럼에 저장
            content_snapshot: {
              ...contentSnapshot,
              video_url: supabaseVideoUrl  // 호환성을 위해 여기도 유지
            }
          })
          .eq('id', savedProject.id)
          .eq('user_id', user.id); // 보안: 소유권 검증

      } catch (error) {
        console.error('Error saving video to Supabase:', error);
        // S3 URL은 여전히 사용 가능하므로 실패해도 계속 진행
        supabaseVideoUrl = renderOutputUrl;
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Project saved successfully',
      projectSaveId: savedProject.id,
      needsRender: !validRenderId && !renderOutputUrl, // 렌더링이 전현 없을 때만 true
      videoUrl: supabaseVideoUrl || renderOutputUrl,
      storageLocation: supabaseVideoUrl ? 'supabase' : renderOutputUrl ? 's3' : null
    });

  } catch (error) {
    console.error('Save API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to save project',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// 프로젝트 로드 엔드포인트
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectName = searchParams.get('projectName');
    
    if (!projectName) {
      return NextResponse.json(
        { error: 'Project name is required' },
        { status: 400 }
      );
    }

    // 사용자 인증 확인 (보안 유틸리티 사용)
    const { user, error: authError } = await requireAuth(request);
    if (authError) {
      return authError;
    }
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const supabase = await createClient();

    // 프로젝트 조회 (단일 레코드)
    const { data: projectSave, error } = await supabase
      .from('project_saves')
      .select('*')
      .eq('user_id', user.id)
      .eq('project_name', projectName)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Project not found' },
          { status: 404 }
        );
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
      project: projectSave
    });

  } catch (error) {
    console.error('Load project error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to load project',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}