import { ProjectSave } from '@/shared/types/database';
import { VideoClip, TextClip, SoundClip } from '@/shared/types/video-editor';

export interface ProjectListItem {
  id: string;
  project_name: string;
  thumbnail_url: string | null;
  latest_video_url: string | null;
  updated_at: string;
  duration_frames?: number;
}

// 프로젝트 저장 응답 타입
export interface SaveProjectResponse {
  success: boolean;
  message?: string;
  error?: string;
  projectSaveId?: string; // number에서 string (UUID)로 변경
  needsRender?: boolean;
  videoUrl?: string | null;
  storageLocation?: string | null;
}

// 프로젝트 저장 파라미터 타입
export interface SaveProjectParams {
  projectId?: string | null;
  projectName: string;
  videoClips: VideoClip[];
  textClips: TextClip[];
  soundClips: SoundClip[];
  soundLanes?: number[]; // 사운드 레인 배열
  aspectRatio: '9:16' | '1:1' | '16:9';
  durationInFrames: number;
  renderId?: string;
  renderOutputUrl?: string;
}

// 프로젝트 저장
export async function saveProject(params: SaveProjectParams): Promise<SaveProjectResponse> {
  console.log('[API] saveProject 호출됨 - params:', { 
    projectId: params.projectId, 
    projectName: params.projectName 
  });
  
  try {
    const requestBody = {
      projectId: params.projectId,
      projectName: params.projectName,
      videoClips: params.videoClips,
      textClips: params.textClips,
      soundClips: params.soundClips,
      soundLanes: params.soundLanes,
      aspectRatio: params.aspectRatio,
      durationInFrames: params.durationInFrames,
      renderId: params.renderId,
      renderOutputUrl: params.renderOutputUrl,
    };
    
    console.log('[API] 서버로 전송할 데이터:', { 
      projectId: requestBody.projectId, 
      projectName: requestBody.projectName 
    });
    
    const response = await fetch('/api/video/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // 쿠키 포함
      body: JSON.stringify(requestBody),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error || errorData.details || `Failed to save project: ${response.status}`,
      };
    }
    
    const data = await response.json();
    return {
      success: true,
      message: data.message || 'Project saved successfully',
      projectSaveId: data.projectSaveId,
      needsRender: data.needsRender,
      videoUrl: data.videoUrl,
      storageLocation: data.storageLocation,
    };
  } catch (error) {
    console.error('Error saving project:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save project',
    };
  }
}

// 사용자의 모든 프로젝트 목록 가져오기
export async function fetchUserProjects(): Promise<ProjectListItem[]> {
  try {
    const response = await fetch('/api/video/projects', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // 쿠키 포함
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Failed to fetch projects: ${response.status}`);
    }
    
    const data = await response.json();
    return data.projects || [];
  } catch (error) {
    throw error;
  }
}

// 특정 프로젝트 로드
export async function loadProject(projectNameOrId: string, isId: boolean = false): Promise<ProjectSave> {
  try {
    const queryParam = isId ? `projectId=${encodeURIComponent(projectNameOrId)}` : `projectName=${encodeURIComponent(projectNameOrId)}`;
    const response = await fetch(`/api/video/save?${queryParam}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to load project');
    }
    
    const { project } = await response.json();
    return project;
  } catch (error) {
    console.error('Error loading project:', error);
    throw error;
  }
}

// 프로젝트 삭제
export async function deleteProject(projectId: string): Promise<void> {
  try {
    const response = await fetch(`/api/video/projects?projectId=${encodeURIComponent(projectId)}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete project');
    }
  } catch (error) {
    console.error('Error deleting project:', error);
    throw error;
  }
}

// 상대 시간 포맷 (예: "2 days ago", "1 week ago")
export function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const past = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  }
  if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  }
  if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  }
  if (diffInSeconds < 2592000) {
    const weeks = Math.floor(diffInSeconds / 604800);
    return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
  }
  
  const months = Math.floor(diffInSeconds / 2592000);
  return `${months} ${months === 1 ? 'month' : 'months'} ago`;
}

// 새 프로젝트 생성
export async function createNewProject(projectName: string = 'Untitled Project'): Promise<{
  success: boolean;
  projectId?: string;
  error?: string;
}> {
  try {
    const response = await fetch('/api/video/projects/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ projectName }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error || 'Failed to create project',
      };
    }
    
    const data = await response.json();
    return {
      success: true,
      projectId: data.projectId,
    };
  } catch (error) {
    console.error('Error creating project:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create project',
    };
  }
}

// Duration을 시간 형식으로 변환 (프레임 -> MM:SS)
export function formatDuration(frames?: number, fps: number = 30): string {
  if (!frames) return '00:00';
  
  const totalSeconds = Math.floor(frames / fps);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}