import crypto from 'crypto';
import { createClient } from '@/shared/lib/supabase/server';
import { createServiceClient } from '@/shared/lib/supabase/service';
import { 
  saveProjectRequestSchema, 
  loadProjectRequestSchema,
  type SaveProjectRequest, 
  type LoadProjectRequest,
  type SaveProjectResponse,
  type LoadProjectResponse,
  type ContentSnapshot
} from './schemas';

/**
 * Video Editor 프로젝트 관리 서비스
 * 
 * @description
 * 비디오 에디터에서 프로젝트 저장, 로드, 컨텐츠 해시 관리 등을 담당합니다.
 * S3에서 Supabase Storage로의 비디오 마이그레이션도 처리합니다.
 */
export class ProjectService {
  
  /**
   * 프로젝트를 저장합니다
   * 
   * @param request - 프로젝트 저장 요청 데이터
   * @param user - 인증된 사용자 정보
   * @returns Promise<SaveProjectResponse>
   */
  async saveProject(
    request: SaveProjectRequest, 
    user: { id: string }
  ): Promise<SaveProjectResponse> {
    // 입력 검증
    const validated = saveProjectRequestSchema.parse(request);
    const {
      projectId,
      projectName,
      videoClips,
      textClips,
      soundClips,
      aspectRatio,
      durationInFrames,
      renderId,
      renderOutputUrl
    } = validated;

    const userId = user.id;

    // 컨텐츠 해시 생성
    const contentHash = this.generateContentHash({
      videoClips,
      textClips,
      soundClips,
      aspectRatio
    });

    // 첫 번째 비디오 클립의 썸네일 URL 추출
    const thumbnailUrl = this.extractThumbnailUrl(videoClips);

    // 컨텐츠 스냅샷 생성
    const contentSnapshot: ContentSnapshot = {
      version: '1.0',
      aspect_ratio: aspectRatio,
      duration_frames: durationInFrames,
      video_clips: videoClips,
      text_clips: textClips,
      sound_clips: soundClips,
      content_hash: contentHash
    };

    // render_id 검증
    const validRenderId = renderId ? await this.validateRenderId(renderId) : null;

    // 기존 프로젝트 확인 및 저장/업데이트
    const supabase = await createClient();
    
    let existingProject;
    if (projectId) {
      // projectId로 기존 프로젝트 찾기 (UUID 기반)
      const { data } = await supabase
        .from('project_saves')
        .select('id')
        .eq('user_id', userId)
        .eq('id', projectId)
        .single();
      existingProject = data;
    } else {
      // projectId가 없으면 프로젝트명으로 찾기 (하위 호환성)
      const { data } = await supabase
        .from('project_saves')
        .select('id')
        .eq('user_id', userId)
        .eq('project_name', projectName)
        .single();
      existingProject = data;
    }
    
    let savedProject;
    if (existingProject) {
      // 기존 프로젝트 업데이트
      const { data, error: updateError } = await supabase
        .from('project_saves')
        .update({
          project_name: projectName, // 프로젝트명 업데이트 추가
          latest_render_id: validRenderId || null,
          latest_video_url: null, // 렌더링 후 업데이트 예정
          thumbnail_url: thumbnailUrl,
          content_snapshot: contentSnapshot,
          content_hash: contentHash,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingProject.id)
        .select()
        .single();
      
      if (updateError) {
        console.error('Error updating project:', updateError);
        throw new Error('Failed to update project');
      }
      savedProject = data;
    } else {
      // 새 프로젝트 생성
      const newProjectId = crypto.randomUUID();
      const { data, error: insertError } = await supabase
        .from('project_saves')
        .insert({
          id: newProjectId,
          user_id: userId,
          project_name: projectName,
          latest_render_id: validRenderId || null,
          latest_video_url: null, // 렌더링 후 업데이트 예정
          thumbnail_url: thumbnailUrl,
          content_snapshot: contentSnapshot,
          content_hash: contentHash,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (insertError) {
        console.error('Error inserting project:', insertError);
        throw new Error('프로젝트 생성에 실패했습니다.');
      }
      savedProject = data;
    }

    // validRenderId가 있으면 video_renders 업데이트
    if (validRenderId) {
      await supabase
        .from('video_renders')
        .update({ project_save_id: savedProject.id })
        .eq('render_id', validRenderId);
    }

    // 비디오 URL이 있으면 S3에서 Supabase Storage로 마이그레이션
    let supabaseVideoUrl: string | null = null;
    if (renderOutputUrl) {
      try {
        supabaseVideoUrl = await this.migrateVideoToSupabase(
          renderOutputUrl,
          projectName,
          userId,
          contentSnapshot,
          savedProject.id // number에서 string (uuid)으로 변경
        );
      } catch (error) {
        console.error('Error migrating video to Supabase:', error);
        // S3 URL은 여전히 사용 가능하므로 실패해도 계속 진행
        supabaseVideoUrl = renderOutputUrl;
      }
    }

    return {
      success: true,
      message: 'Project saved successfully',
      projectSaveId: savedProject.id, // number에서 string (uuid)으로 변경
      needsRender: !validRenderId && !renderOutputUrl,
      videoUrl: supabaseVideoUrl || renderOutputUrl || null,
      storageLocation: supabaseVideoUrl ? 'supabase' : renderOutputUrl ? 's3' : null
    };
  }

  /**
   * 프로젝트를 로드합니다
   * 
   * @param request - 프로젝트 로드 요청 데이터
   * @param user - 인증된 사용자 정보
   * @returns Promise<LoadProjectResponse>
   */
  async loadProject(
    request: LoadProjectRequest, 
    user: { id: string }
  ): Promise<LoadProjectResponse> {
    // 입력 검증
    const validated = loadProjectRequestSchema.parse(request);
    const { projectName, projectId } = validated;
    const userId = user.id;
    
    const supabase = await createClient();

    // 프로젝트 조회
    let query = supabase
      .from('project_saves')
      .select('*')
      .eq('user_id', userId);

    if (projectId) {
      query = query.eq('id', projectId);
    } else if (projectName) {
      query = query.eq('project_name', projectName);
    }

    const { data: projectSave, error } = await query.single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('프로젝트를 찾을 수 없습니다.');
      }
      throw new Error('프로젝트 로드에 실패했습니다.');
    }

    return {
      success: true,
      project: projectSave
    };
  }

  /**
   * 컨텐츠 해시를 생성합니다
   * 
   * @private
   */
  private generateContentHash(data: {
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
          startTime: s.startTime || 0,
          endTime: s.endTime,
          fadeInDuration: s.fadeInDuration || 0,
          fadeOutDuration: s.fadeOutDuration || 0,
          fadeInType: s.fadeInType || 'linear',
          fadeOutType: s.fadeOutType || 'linear',
          maxDuration: s.maxDuration,
          waveformData: s.waveformData
        };
      }).sort((a, b) => (a.position as number) - (b.position as number))
    };

    // SHA256 해시 생성
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(essentialData))
      .digest('hex');
  }

  /**
   * 첫 번째 비디오 클립에서 썸네일 URL을 추출합니다
   * 
   * @private
   */
  private extractThumbnailUrl(videoClips: unknown[]): string | null {
    if (videoClips && videoClips.length > 0) {
      const firstClip = videoClips[0] as Record<string, unknown>;
      return (firstClip.thumbnail as string) || null;
    }
    return null;
  }

  /**
   * Render ID가 존재하는지 검증합니다
   * 
   * @private
   */
  private async validateRenderId(renderId: string): Promise<string | null> {
    const supabase = await createClient();
    const { data: renderExists } = await supabase
      .from('video_renders')
      .select('render_id')
      .eq('render_id', renderId)
      .single();
    
    if (renderExists) {
      return renderId;
    } else {
      console.warn(`Render ID ${renderId} not found in video_renders table`);
      return null;
    }
  }

  /**
   * 안전한 파일명을 생성합니다
   * 
   * @private
   */
  private sanitizeFileName(fileName: string): string {
    return fileName
      .replace(/[^a-zA-Z0-9가-힣.\-_]/g, '_')
      .replace(/\s+/g, '_')
      .replace(/_{2,}/g, '_')
      .slice(0, 100);
  }

  /**
   * S3에서 Supabase Storage로 비디오를 마이그레이션합니다
   * 
   * @private
   */
  private async migrateVideoToSupabase(
    renderOutputUrl: string,
    projectName: string,
    userId: string,
    contentSnapshot: ContentSnapshot,
    projectSaveId: string // number에서 string (uuid)으로 변경
  ): Promise<string | null> {
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
    const safeProjectName = this.sanitizeFileName(projectName);
    const videoPath = `video-projects/${userId}/${safeProjectName}/${videoFileName}`;
    
    // 2. Service Client를 사용하여 Supabase Storage에 비디오 업로드
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

    // 3. 비디오 공개 URL 가져오기
    const { data: { publicUrl } } = serviceSupabase.storage
      .from('user-uploads')
      .getPublicUrl(videoPath);
    
    console.log('Video uploaded to Supabase:', publicUrl);

    // 4. 메타데이터 저장
    const metadataPath = `video-projects/${userId}/${safeProjectName}/metadata.json`;
    const { error: metadataError } = await serviceSupabase.storage
      .from('user-uploads')
      .upload(metadataPath, JSON.stringify({
        projectName,
        savedAt: new Date().toISOString(),
        s3Url: renderOutputUrl,
        supabaseUrl: publicUrl,
        contentSnapshot
      }), {
        contentType: 'application/json',
        upsert: true
      });

    if (metadataError) {
      console.error('Error uploading metadata:', metadataError);
      // 메타데이터 업로드 실패는 치명적이지 않으므로 계속 진행
    }

    // 5. project_saves 테이블 업데이트
    await serviceSupabase
      .from('project_saves')
      .update({ 
        latest_video_url: publicUrl,
        content_snapshot: {
          ...contentSnapshot,
          video_url: publicUrl
        }
      })
      .eq('id', projectSaveId) // id에서 project_uuid로 변경
      .eq('user_id', userId);

    return publicUrl;
  }
}