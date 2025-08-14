import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
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
    
    let { renderId, renderOutputUrl } = body;

    // 컨텐츠 해시 생성
    const contentHash = generateContentHash({
      videoClips,
      textClips,
      soundClips,
      aspectRatio
    });

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

    // 기존 저장 확인
    const { data: existingSave, error: fetchError } = await supabase
      .from('project_saves')
      .select('*')
      .eq('user_id', user.id)
      .eq('project_name', projectName)
      .eq('is_latest', true)
      .single();
    
    // 클라이언트가 renderId를 모르는 경우, 기존 저장에서 가져오기
    if (!renderId && !renderOutputUrl && existingSave) {
      renderId = existingSave.latest_render_id;
      renderOutputUrl = existingSave.content_snapshot?.video_url;
    }

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows
      console.error('Error fetching existing save:', fetchError);
      throw fetchError;
    }

    // 변경사항 체크
    const hasChanges = !existingSave || existingSave.content_hash !== contentHash;

    if (!hasChanges && existingSave) {
      // 변경사항 없음 - 기존 데이터 반환
      // renderId가 제공되었으면 업데이트 (렌더링 완료 후 호출)
      if (renderId && renderId !== existingSave.latest_render_id) {
        await supabase
          .from('project_saves')
          .update({ 
            latest_render_id: renderId,
            content_snapshot: {
              ...existingSave.content_snapshot,
              video_url: renderOutputUrl
            }
          })
          .eq('id', existingSave.id);
      }
      
      // 기존 저장된 비디오 URL 가져오기
      const existingVideoUrl = existingSave.content_snapshot?.video_url || renderOutputUrl;
      
      return NextResponse.json({
        success: true,
        message: 'No changes detected',
        projectSaveId: existingSave.id,
        renderId: existingSave.latest_render_id || renderId,
        needsRender: false,
        videoUrl: existingVideoUrl,
        storageLocation: existingVideoUrl?.includes('supabase') ? 'supabase' : 's3'
      });
    }

    // 변경사항 있음 또는 새 프로젝트
    if (existingSave) {
      // 기존 버전을 is_latest = false로 업데이트
      await supabase
        .from('project_saves')
        .update({ is_latest: false })
        .eq('user_id', user.id)
        .eq('project_name', projectName);
    }

    // 새 버전 생성
    const newVersion = existingSave ? existingSave.version + 1 : 1;
    
    const { data: newSave, error: insertError } = await supabase
      .from('project_saves')
      .insert({
        user_id: user.id,
        project_name: projectName,
        latest_render_id: renderId || null,
        content_snapshot: contentSnapshot,
        content_hash: contentHash,
        version: newVersion,
        is_latest: true
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating project save:', insertError);
      throw insertError;
    }

    // 렌더링이 있으면 video_renders 업데이트
    if (renderId) {
      await supabase
        .from('video_renders')
        .update({ project_save_id: newSave.id })
        .eq('render_id', renderId);
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
        const videoFileName = `video-v${newVersion}.mp4`;
        const videoPath = `video-projects/${user.id}/${projectName}/${videoFileName}`;
        
        // 2. Supabase Storage에 비디오 업로드
        console.log('Uploading video to Supabase Storage:', videoPath);
        const { error: videoError } = await supabase.storage
          .from('videos')
          .upload(videoPath, videoBlob, {
            contentType: 'video/mp4',
            upsert: true
          });

        if (videoError) {
          console.error('Error uploading video:', videoError);
          throw videoError;
        }

        // 3. 비디오 공개 URL 가져오기
        const { data: { publicUrl } } = supabase.storage
          .from('videos')
          .getPublicUrl(videoPath);
        
        supabaseVideoUrl = publicUrl;
        console.log('Video uploaded to Supabase:', supabaseVideoUrl);

        // 4. 메타데이터 저장
        const metadataPath = `video-projects/${user.id}/${projectName}/metadata.json`;
        const { error: metadataError } = await supabase.storage
          .from('videos')
          .upload(metadataPath, JSON.stringify({
            projectName,
            version: newVersion,
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

        // 5. project_saves 테이블 업데이트 (Supabase URL 저장)
        await supabase
          .from('project_saves')
          .update({ 
            latest_render_id: renderId,
            content_snapshot: {
              ...contentSnapshot,
              video_url: supabaseVideoUrl
            }
          })
          .eq('id', newSave.id);

      } catch (error) {
        console.error('Error saving video to Supabase:', error);
        // S3 URL은 여전히 사용 가능하므로 실패해도 계속 진행
        supabaseVideoUrl = renderOutputUrl;
      }
    }

    return NextResponse.json({
      success: true,
      message: hasChanges ? 'Project saved with new version' : 'New project saved',
      projectSaveId: newSave.id,
      version: newVersion,
      needsRender: !renderId && !renderOutputUrl, // 렌더링이 전혀 없을 때만 true
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

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 최신 저장 조회
    const { data: projectSave, error } = await supabase
      .from('project_saves')
      .select('*')
      .eq('user_id', user.id)
      .eq('project_name', projectName)
      .eq('is_latest', true)
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