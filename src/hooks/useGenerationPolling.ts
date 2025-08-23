/**
 * 통합 Generation Polling Hook
 * VideoGeneration, ImageBrush, SoundLibrary에서 사용하는 공통 polling 로직
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export interface JobStatus {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  queuePosition?: number;
  estimatedWaitTime?: number;
  result?: unknown;
  error?: string;
  message?: string;
}

export interface PollingConfig {
  jobId: string;
  endpoint: string; // 일반 상태 확인 endpoint
  fallbackEndpoint?: string; // 5분 후 fallback endpoint (예: /poll)
  interval?: number; // polling 간격 (ms)
  maxRetries?: number; // 최대 재시도 횟수
  fallbackAfter?: number; // fallback 시작 시간 (ms) 
  onProgress: (progress: number, data?: unknown) => void;
  onSuccess: (result: unknown, jobId: string) => void;
  onError: (error: Error, jobId: string) => void;
  onStatusChange?: (status: JobStatus) => void;
}

export interface PollingControls {
  startPolling: () => void;
  stopPolling: () => void;
  isPolling: boolean;
  retryCount: number;
  isFallbackMode: boolean;
}

export function useGenerationPolling(config: PollingConfig): PollingControls {
  const [isPolling, setIsPolling] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isFallbackMode, setIsFallbackMode] = useState(false);
  
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const lastProgressRef = useRef<number>(1);
  
  const {
    jobId,
    endpoint,
    fallbackEndpoint,
    interval = 2000,
    maxRetries = 150, // 5분 (2초 * 150)
    fallbackAfter = 300000, // 5분
    onProgress,
    onSuccess,
    onError,
    onStatusChange
  } = config;

  /**
   * 단일 polling 요청 실행
   */
  const poll = useCallback(async (): Promise<void> => {
    if (!isPolling) return;

    try {
      const elapsed = Date.now() - startTimeRef.current;
      const shouldUseFallback = elapsed > fallbackAfter && fallbackEndpoint;
      
      // 5분 후 fallback endpoint 사용
      const pollEndpoint = shouldUseFallback ? fallbackEndpoint : endpoint;
      
      if (shouldUseFallback && !isFallbackMode) {
        console.log(`[${jobId}] Switching to fallback mode after ${elapsed}ms`);
        setIsFallbackMode(true);
      }

      const response = await fetch(pollEndpoint);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: JobStatus = await response.json();
      
      // 상태 변경 콜백 호출
      onStatusChange?.(data);

      switch (data.status) {
        case 'completed':
          console.log(`[${jobId}] Job completed successfully`);
          setIsPolling(false);
          onSuccess(data.result || data, jobId);
          break;

        case 'failed':
          console.error(`[${jobId}] Job failed: ${data.error}`);
          setIsPolling(false);
          onError(new Error(data.error || 'Generation failed'), jobId);
          break;

        case 'processing':
        case 'pending':
          // Progress 업데이트 (역행 방지)
          if (data.progress !== undefined) {
            const newProgress = Math.max(lastProgressRef.current, data.progress);
            if (newProgress > lastProgressRef.current) {
              lastProgressRef.current = newProgress;
              onProgress(newProgress, data);
            }
          } else {
            // Progress 정보가 없으면 기본값 사용
            const defaultProgress = data.status === 'processing' ? 40 : 10;
            const safeProgress = Math.max(lastProgressRef.current, defaultProgress);
            onProgress(safeProgress, data);
          }
          break;

        default:
          console.warn(`[${jobId}] Unknown status: ${data.status}`);
          break;
      }

      // 재시도 카운터 리셋 (성공 시)
      setRetryCount(0);

    } catch (error) {
      const currentRetry = retryCount + 1;
      setRetryCount(currentRetry);

      console.error(`[${jobId}] Polling error (attempt ${currentRetry}):`, error);

      // 최대 재시도 횟수 초과 시 중단
      if (currentRetry >= maxRetries) {
        console.error(`[${jobId}] Max retries exceeded, stopping polling`);
        setIsPolling(false);
        onError(
          new Error(`Polling failed after ${maxRetries} attempts`),
          jobId
        );
        return;
      }

      // 네트워크 에러가 연속으로 3번 이상 발생하면 사용자에게 알림
      if (currentRetry >= 3 && currentRetry % 3 === 0) {
        console.warn(`[${jobId}] Multiple network errors, but continuing...`);
        // 필요시 onError 대신 별도 콜백으로 경고 표시
      }
    }
  }, [
    jobId,
    endpoint,
    fallbackEndpoint,
    fallbackAfter,
    maxRetries,
    isPolling,
    isFallbackMode,
    retryCount,
    onProgress,
    onSuccess,
    onError,
    onStatusChange
  ]);

  /**
   * Polling 시작
   */
  const startPolling = useCallback(() => {
    if (isPolling) return;

    console.log(`[${jobId}] Starting polling with interval: ${interval}ms`);
    
    setIsPolling(true);
    setRetryCount(0);
    setIsFallbackMode(false);
    startTimeRef.current = Date.now();
    lastProgressRef.current = 1;

    // 즉시 첫 번째 polling 실행 (1초 후)
    setTimeout(() => {
      if (isPolling) {
        poll();
      }
    }, 1000);

    // 정규 interval로 polling 시작
    pollingIntervalRef.current = setInterval(() => {
      poll();
    }, interval);

  }, [jobId, interval, isPolling, poll]);

  /**
   * Polling 중단
   */
  const stopPolling = useCallback(() => {
    console.log(`[${jobId}] Stopping polling`);
    
    setIsPolling(false);
    setIsFallbackMode(false);
    
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, [jobId]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  return {
    startPolling,
    stopPolling,
    isPolling,
    retryCount,
    isFallbackMode
  };
}

/**
 * 다중 Job Polling Hook (SoundLibrary 4개 variation용)
 */
export interface MultiPollingConfig {
  jobIds: string[];
  endpoint: string; // /api/sound/jobs/{jobId} 등
  fallbackEndpoint?: string; // /api/sound/jobs/{jobId}/poll 등
  interval?: number;
  maxRetries?: number;
  fallbackAfter?: number;
  onJobProgress: (jobId: string, progress: number, data?: unknown) => void;
  onJobSuccess: (jobId: string, result: unknown) => void;
  onJobError: (jobId: string, error: Error) => void;
  onAllCompleted?: (results: { [jobId: string]: unknown }) => void;
}

export function useMultiGenerationPolling(config: MultiPollingConfig) {
  const [activeJobs, setActiveJobs] = useState(new Set(config.jobIds));
  const [completedJobs, setCompletedJobs] = useState(new Map<string, unknown>());
  const [failedJobs, setFailedJobs] = useState(new Set<string>());
  
  // Manual polling implementation instead of using hooks in loop
  const pollingTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());
  
  const createPollingForJob = useCallback((jobId: string) => {
    const endpoint = config.endpoint.replace('{jobId}', jobId);
    const fallbackEndpoint = config.fallbackEndpoint?.replace('{jobId}', jobId);
    let retryCount = 0;
    const startTime = Date.now();
    
    const poll = async () => {
      try {
        const shouldUseFallback = fallbackEndpoint && 
          (Date.now() - startTime) > (config.fallbackAfter || 300000); // 5분
        
        const currentEndpoint = shouldUseFallback ? fallbackEndpoint : endpoint;
        const response = await fetch(currentEndpoint);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        // Progress update
        if (data.progress) {
          config.onJobProgress(jobId, data.progress, data);
        }
        
        // Success
        if (data.status === 'completed') {
          config.onJobSuccess(jobId, data.result || data);
          setActiveJobs(prev => {
            const next = new Set(prev);
            next.delete(jobId);
            return next;
          });
          setCompletedJobs(prev => new Map(prev).set(jobId, data.result || data));
          
          // Clear timer
          const timer = pollingTimers.current.get(jobId);
          if (timer) {
            clearTimeout(timer);
            pollingTimers.current.delete(jobId);
          }
          return;
        }
        
        // Failed
        if (data.status === 'failed') {
          throw new Error(data.error || 'Job failed');
        }
        
        // Continue polling
        if (data.status === 'pending' || data.status === 'processing') {
          const timer = setTimeout(poll, config.interval || 2000);
          pollingTimers.current.set(jobId, timer);
        }
        
      } catch (error) {
        retryCount++;
        const maxRetries = config.maxRetries || 10;
        
        if (retryCount < maxRetries) {
          const timer = setTimeout(poll, config.interval || 2000);
          pollingTimers.current.set(jobId, timer);
        } else {
          config.onJobError(jobId, error instanceof Error ? error : new Error(String(error)));
          setActiveJobs(prev => {
            const next = new Set(prev);
            next.delete(jobId);
            return next;
          });
          setFailedJobs(prev => new Set([...prev, jobId]));
        }
      }
    };
    
    // Start polling after 1 second
    const initialTimer = setTimeout(poll, 1000);
    pollingTimers.current.set(jobId, initialTimer);
  }, [config]);

  // 모든 job 시작
  const startAll = useCallback(() => {
    config.jobIds.forEach(jobId => createPollingForJob(jobId));
  }, [config.jobIds, createPollingForJob]);

  // 모든 job 중단
  const stopAll = useCallback(() => {
    pollingTimers.current.forEach(timer => clearTimeout(timer));
    pollingTimers.current.clear();
  }, []);

  // 모든 job 완료 감지
  useEffect(() => {
    if (activeJobs.size === 0 && config.jobIds.length > 0) {
      const results = Object.fromEntries(completedJobs);
      config.onAllCompleted?.(results);
    }
  }, [activeJobs.size, completedJobs, config]);

  return {
    startAll,
    stopAll,
    activeJobs: Array.from(activeJobs),
    completedJobs: Object.fromEntries(completedJobs),
    failedJobs: Array.from(failedJobs),
    isAllCompleted: activeJobs.size === 0,
    hasAnyCompleted: completedJobs.size > 0
  };
}