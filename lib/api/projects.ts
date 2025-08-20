import { ProjectSave } from '@/types/database';

export interface ProjectListItem {
  id: number;
  project_name: string;
  thumbnail_url: string | null;
  latest_video_url: string | null;
  updated_at: string;
  duration_frames?: number;
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
export async function loadProject(projectName: string): Promise<ProjectSave> {
  try {
    const response = await fetch(`/api/video/save?projectName=${encodeURIComponent(projectName)}`);
    
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
export async function deleteProject(projectName: string): Promise<void> {
  try {
    const response = await fetch(`/api/video/projects?projectName=${encodeURIComponent(projectName)}`, {
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

// Duration을 시간 형식으로 변환 (프레임 -> MM:SS)
export function formatDuration(frames?: number, fps: number = 30): string {
  if (!frames) return '00:00';
  
  const totalSeconds = Math.floor(frames / fps);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}