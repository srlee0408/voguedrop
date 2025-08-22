import { useQuery, useMutation, useQueryClient, type Query } from '@tanstack/react-query';
import { SoundGenerationType } from '@/shared/types/sound';

export interface SoundVariation {
  id: string;
  variationNumber: number;
  url: string;
  duration: number;
}

export interface SoundGroup {
  groupId: string;
  prompt: string;
  title: string | null;
  createdAt: string;
  generationType?: string | null;
  variations: SoundVariation[];
}

interface SoundGenerationParams {
  prompt: string;
  title?: string;
  duration_seconds: number;
  generation_type: SoundGenerationType;
}

interface SoundJobStatus {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: {
    url: string;
    title?: string;
    duration: number;
  };
  error?: string;
}

// API 함수들
const fetchSoundHistory = async (filterType: string = 'all'): Promise<SoundGroup[]> => {
  const url = filterType === 'all' 
    ? '/api/sound/history'
    : `/api/sound/history?type=${filterType}`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error('Failed to fetch sound history');
  }
  
  const data = await response.json();
  
  if (data.success && data.groups) {
    return data.groups;
  }
  
  return [];
};

const generateSound = async (params: SoundGenerationParams) => {
  const response = await fetch('/api/sound/generate-async', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Sound generation failed');
  }
  
  return response.json();
};

const fetchSoundJobStatus = async (jobId: string): Promise<SoundJobStatus> => {
  const response = await fetch(`/api/sound/jobs/${jobId}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch job status');
  }
  
  const data = await response.json();
  return data;
};

// Query Keys
export const soundQueryKeys = {
  all: ['sound'] as const,
  history: (filterType: string = 'all') => [...soundQueryKeys.all, 'history', filterType] as const,
  job: (jobId: string) => [...soundQueryKeys.all, 'job', jobId] as const,
};

// 커스텀 Hooks
export function useSoundHistory(filterType: string = 'all', enabled = true) {
  return useQuery({
    queryKey: soundQueryKeys.history(filterType),
    queryFn: () => fetchSoundHistory(filterType),
    enabled,
    staleTime: 5 * 60 * 1000, // 5분간 fresh
    gcTime: 10 * 60 * 1000, // 10분간 캐시 유지
    retry: (failureCount, error) => {
      // 401 에러 (인증 실패)는 재시도하지 않음
      if (error instanceof Error && error.message.includes('401')) {
        return false;
      }
      return failureCount < 1;
    },
  });
}

export function useSoundGeneration() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: generateSound,
    onSuccess: () => {
      // 성공 시 sound history 재검증
      queryClient.invalidateQueries({ 
        queryKey: soundQueryKeys.all 
      });
    },
    onError: (error) => {
      console.error('Sound generation failed:', error);
    },
  });
}

// 폴링용 Hook
export function useSoundJobPolling(jobId: string | null, enabled = false) {
  return useQuery({
    queryKey: soundQueryKeys.job(jobId || ''),
    queryFn: () => fetchSoundJobStatus(jobId!),
    enabled: enabled && !!jobId,
    refetchInterval: (query: Query<SoundJobStatus, Error>) => {
      // 완료되거나 실패하면 폴링 중지
      const data = query.state.data;
      if (data && (data.status === 'completed' || data.status === 'failed')) {
        return false;
      }
      return 2000; // 2초마다 폴링
    },
    retry: false, // 폴링 중에는 재시도하지 않음
    staleTime: 0, // 항상 최신 상태 확인
  });
}

// 여러 Job을 동시에 폴링하는 Hook
export function useMultipleSoundJobsPolling(jobIds: string[], enabled = false) {
  const queries = jobIds.map(jobId => ({
    queryKey: soundQueryKeys.job(jobId),
    queryFn: () => fetchSoundJobStatus(jobId),
    enabled: enabled && !!jobId,
    refetchInterval: (query: Query<SoundJobStatus, Error>) => {
      const data = query.state.data;
      if (data && (data.status === 'completed' || data.status === 'failed')) {
        return false;
      }
      return 2000;
    },
    retry: false,
    staleTime: 0,
  }));

  return queries;
}

// 수동으로 sound history 새로고침
export function useRefreshSoundHistory() {
  const queryClient = useQueryClient();
  
  return () => {
    queryClient.invalidateQueries({
      queryKey: soundQueryKeys.all,
    });
  };
}