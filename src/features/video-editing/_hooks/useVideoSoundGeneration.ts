import { useState, useCallback } from 'react';
import { VideoClip } from '@/shared/types/video-editor';

interface JobProgress {
  jobId: string;
  variationNumber: number;
  progress: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

interface UseVideoSoundGenerationReturn {
  isGenerating: boolean;
  error: string | null;
  jobProgresses: JobProgress[];
  generateFromVideo: (clip: VideoClip, durationSeconds: number) => Promise<string[]>;
  pollJobStatus: (jobId: string) => Promise<{ status: string; [key: string]: unknown } | null>;
  clearError: () => void;
}

export function useVideoSoundGeneration(): UseVideoSoundGenerationReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobProgresses, setJobProgresses] = useState<JobProgress[]>([]);
  
  // 진행률 계산 함수
  const calculateProgressForElapsedTime = (elapsedSeconds: number, expectedDuration: number = 15): number => {
    const checkpoints = [
      { time: 2, progress: 15 },
      { time: 4, progress: 30 },
      { time: 6, progress: 50 },
      { time: 8, progress: 65 },
      { time: 10, progress: 80 },
      { time: 12, progress: 88 },
      { time: 15, progress: 90 }
    ];
    
    let targetProgress = 0;
    
    for (let i = 0; i < checkpoints.length; i++) {
      const checkpoint = checkpoints[i];
      const nextCheckpoint = checkpoints[i + 1];
      
      if (elapsedSeconds >= checkpoint.time) {
        if (!nextCheckpoint || elapsedSeconds < nextCheckpoint.time) {
          if (nextCheckpoint) {
            const timeRatio = (elapsedSeconds - checkpoint.time) / (nextCheckpoint.time - checkpoint.time);
            const progressDiff = nextCheckpoint.progress - checkpoint.progress;
            targetProgress = checkpoint.progress + (progressDiff * timeRatio);
          } else {
            targetProgress = checkpoint.progress;
          }
          break;
        }
      } else if (i === 0) {
        targetProgress = (elapsedSeconds / checkpoint.time) * checkpoint.progress;
        break;
      }
    }
    
    if (elapsedSeconds > expectedDuration) {
      const overtime = elapsedSeconds - expectedDuration;
      const slowdown = Math.log(1 + overtime / expectedDuration) * 2;
      targetProgress = Math.max(85, 90 - slowdown);
    }
    
    return Math.min(targetProgress, 90);
  };
  
  // Job 상태 조회
  const pollJobStatus = useCallback(async (jobId: string): Promise<{ status: string; [key: string]: unknown } | null> => {
    try {
      const response = await fetch(`/api/sound/jobs/${jobId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch job status');
      }
      return await response.json();
    } catch (err) {
      console.error(`Failed to poll job ${jobId}:`, err);
      return null;
    }
  }, []);
  
  // 비디오 기반 음악 생성
  const generateFromVideo = useCallback(async (
    clip: VideoClip, 
    durationSeconds: number
  ): Promise<string[]> => {
    setIsGenerating(true);
    setError(null);
    setJobProgresses([]);
    
    try {
      // job_id 추출 (URL에서 추출하거나 메타데이터에서 가져오기)
      // VideoClip에 job_id가 없으므로, URL 기반으로 추출하거나 다른 식별자 사용
      const videoJobId = extractJobIdFromClip(clip);
      
      if (!videoJobId) {
        throw new Error(`비디오 정보를 찾을 수 없습니다. (Clip ID: ${clip.id})`);
      }
      
      // API 호출 (프롬프트는 서버에서만 처리)
      const response = await fetch('/api/sound/generate-from-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          video_job_id: videoJobId,
          duration_seconds: durationSeconds,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '음악 생성에 실패했습니다.');
      }
      
      const { jobIds } = data;
      
      // Job 진행률 초기화
      const initialProgresses: JobProgress[] = jobIds.map((jobId: string, index: number) => ({
        jobId,
        variationNumber: index + 1,
        progress: 0,
        status: 'processing' as const
      }));
      
      setJobProgresses(initialProgresses);
      
      // 진행률 시뮬레이션
      const startTimes = new Map<string, number>();
      jobIds.forEach((jobId: string) => {
        startTimes.set(jobId, Date.now() + Math.random() * 2000);
      });
      
      const progressInterval = setInterval(() => {
        setJobProgresses(prevProgresses => 
          prevProgresses.map(job => {
            if (job.status === 'completed' || job.status === 'failed') return job;
            
            const startTime = startTimes.get(job.jobId) || Date.now();
            const elapsed = Math.max(0, (Date.now() - startTime) / 1000);
            const newProgress = calculateProgressForElapsedTime(elapsed, 15);
            
            return { ...job, progress: Math.floor(newProgress) };
          })
        );
      }, 500);
      
      // Job 상태 폴링
      const pollIntervals = new Map<string, NodeJS.Timeout>();
      const pollCounts = new Map<string, number>();
      const maxPolls = 60;
      const completedJobs: string[] = [];
      
      await new Promise<void>((resolve) => {
        jobIds.forEach((jobId: string) => {
          pollCounts.set(jobId, 0);
          
          const interval = setInterval(async () => {
            const currentPollCount = (pollCounts.get(jobId) || 0) + 1;
            pollCounts.set(jobId, currentPollCount);
            
            const status = await pollJobStatus(jobId);
            
            if (status?.status === 'completed') {
              clearInterval(interval);
              pollIntervals.delete(jobId);
              completedJobs.push(jobId);
              
              setJobProgresses(prev => 
                prev.map(j => j.jobId === jobId 
                  ? { ...j, status: 'completed', progress: 100 }
                  : j
                )
              );
              
              // 모든 job이 완료되었는지 확인
              if (completedJobs.length === jobIds.length || 
                  pollIntervals.size === 0) {
                clearInterval(progressInterval);
                resolve();
              }
            } else if (status?.status === 'failed' || currentPollCount >= maxPolls) {
              clearInterval(interval);
              pollIntervals.delete(jobId);
              
              setJobProgresses(prev => 
                prev.map(j => j.jobId === jobId 
                  ? { ...j, status: 'failed', progress: 0 }
                  : j
                )
              );
              
              if (pollIntervals.size === 0) {
                clearInterval(progressInterval);
                resolve();
              }
            }
          }, 2000);
          
          pollIntervals.set(jobId, interval);
        });
      });
      
      // 완료된 job ID 반환
      return completedJobs;
      
    } catch (err) {
      console.error('Video-based sound generation error:', err);
      setError(err instanceof Error ? err.message : '음악 생성 중 오류가 발생했습니다.');
      return [];
    } finally {
      setIsGenerating(false);
    }
  }, [pollJobStatus]);
  
  const clearError = useCallback(() => {
    setError(null);
  }, []);
  
  return {
    isGenerating,
    error,
    jobProgresses,
    generateFromVideo,
    pollJobStatus,
    clearError,
  };
}

// VideoClip에서 job_id 추출하는 헬퍼 함수
function extractJobIdFromClip(clip: VideoClip): string | null {
  // clip.id에서 job_id 추출 (형식: "clip-{job_id}-{timestamp}-{index}")
  if (clip.id && clip.id.startsWith('clip-')) {
    // job_id는 "job_"로 시작하고 그 뒤에 문자/숫자/언더스코어/하이픈이 올 수 있음
    // nanoid는 URL-safe 문자를 사용: A-Za-z0-9_-
    const jobIdMatch = clip.id.match(/clip-(job_[a-zA-Z0-9_-]+)-\d+-\d+/);
    if (jobIdMatch && jobIdMatch[1]) {
      return jobIdMatch[1]; // "job_xxxxx" 반환
    }
    
    // 레거시 형식 지원: clip-job_xxxxx (timestamp와 index 없는 경우)
    const legacyMatch = clip.id.match(/clip-(job_[a-zA-Z0-9_-]+)/);
    if (legacyMatch && legacyMatch[1]) {
      return legacyMatch[1];
    }
  }
  
  // URL에서 job_id 추출 시도 (fallback)
  if (clip.url) {
    const match = clip.url.match(/job_[a-zA-Z0-9_-]+/);
    if (match) {
      return match[0]; // "job_xyz123" 형태로 반환
    }
  }
  
  // clip.id가 직접 job_id인 경우 (레거시 지원)
  if (clip.id && clip.id.startsWith('job_')) {
    return clip.id;
  }
  
  console.error('Failed to extract job_id from clip:', {
    clipId: clip.id,
    clipUrl: clip.url
  });
  
  // fallback: null 반환
  return null;
}