/**
 * 통합 Generation Hook
 * 모든 AI 생성 기능(Video, Image, Sound)에 대한 범용적인 인터페이스 제공
 */

import { useCallback, useRef, useState } from 'react';
import { ProgressCalculator } from '@/lib/utils/generation-progress';
import { useErrorHandler, type GenerationError } from '@/lib/generation/error-handler';

export type GenerationType = 'video' | 'image' | 'sound';

export interface GenerationRequest {
  [key: string]: unknown; // API에 전송할 데이터
}

export interface GenerationResult {
  [key: string]: unknown; // API로부터 받은 결과
}

export interface GenerationAdapter<TRequest = GenerationRequest, TResult = GenerationResult> {
  /**
   * API 호출 실행
   */
  callAPI(request: TRequest): Promise<{
    jobId?: string;
    jobIds?: string[];
    result?: TResult; // 즉시 결과 (ImageBrush 동기 방식)
  }>;

  /**
   * Progress 설정
   */
  getProgressConfig(): {
    mode: 'fast' | 'normal' | 'slow';
    expectedDuration: number;
  };

  /**
   * Polling 설정
   */
  getPollingConfig(jobId: string): {
    endpoint: string;
    fallbackEndpoint?: string;
    interval?: number;
    maxRetries?: number;
  };

  /**
   * 결과 변환
   */
  transformResult(apiResult: unknown): TResult;
}

export interface UseGenerationConfig<TRequest = GenerationRequest, TResult = GenerationResult> {
  generationType: GenerationType;
  adapter: GenerationAdapter<TRequest, TResult>;
  maxConcurrent?: number;
  onSuccess?: (result: TResult, jobId?: string) => void;
  onError?: (error: GenerationError) => void;
  onProgress?: (progress: number, jobId?: string) => void;
}

export interface UseGenerationResult<TRequest = GenerationRequest, TResult = GenerationResult> {
  // 상태
  isGenerating: boolean;
  progress: number;
  error: string | null;
  result: TResult | null;

  // 다중 작업 지원 (SoundLibrary)
  multiProgress: Map<string, number>;
  activeJobs: string[];
  completedJobs: Map<string, TResult>;

  // 액션
  generate: (request: TRequest) => Promise<void>;
  cancel: () => void;
  clearError: () => void;
  reset: () => void;
}

/**
 * 통합 Generation Hook
 */
export function useGeneration<TRequest = GenerationRequest, TResult = GenerationResult>(
  config: UseGenerationConfig<TRequest, TResult>
): UseGenerationResult<TRequest, TResult> {
  const { generationType, adapter, maxConcurrent = 1, onSuccess, onError, onProgress } = config;

  // 에러 핸들러
  const { handleError, createErrorMessage } = useErrorHandler(generationType);

  // 상태 관리
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TResult | null>(null);

  // 다중 작업 지원
  const [multiProgress, setMultiProgress] = useState<Map<string, number>>(new Map());
  const [activeJobs, setActiveJobs] = useState<string[]>([]);
  const [completedJobs, setCompletedJobs] = useState<Map<string, TResult>>(new Map());

  // Progress Calculator 관리
  const progressCalculators = useRef<Map<string, ProgressCalculator>>(new Map());
  const pollingTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

  /**
   * 단일 작업 Progress 업데이트
   */
  const updateSingleProgress = useCallback((newProgress: number, jobId?: string) => {
    setProgress(newProgress);
    onProgress?.(newProgress, jobId);
  }, [onProgress]);

  /**
   * 다중 작업 Progress 업데이트  
   */
  const updateMultiProgress = useCallback((jobId: string, newProgress: number) => {
    setMultiProgress(prev => {
      const next = new Map(prev);
      next.set(jobId, newProgress);
      return next;
    });
    onProgress?.(newProgress, jobId);
  }, [onProgress]);

  /**
   * Progress Calculator 생성
   */
  const createProgressCalculator = useCallback((jobId: string) => {
    const progressConfig = adapter.getProgressConfig();
    
    const calculator = new ProgressCalculator(
      progressConfig,
      (progress) => {
        if (maxConcurrent === 1) {
          updateSingleProgress(progress, jobId);
        } else {
          updateMultiProgress(jobId, progress);
        }
      }
    );

    progressCalculators.current.set(jobId, calculator);
    calculator.start(); // 즉시 1%에서 시작
    
    return calculator;
  }, [adapter, maxConcurrent, updateSingleProgress, updateMultiProgress]);

  /**
   * 폴링 시작
   */
  const startPolling = useCallback((jobId: string) => {
    const pollingConfig = adapter.getPollingConfig(jobId);
    let retryCount = 0;
    
    const poll = async () => {
      try {
        const response = await fetch(pollingConfig.endpoint);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        // Progress 업데이트
        if (data.status === 'processing' && data.progress) {
          const calculator = progressCalculators.current.get(jobId);
          calculator?.setTarget(data.progress);
        }
        
        // 완료 처리
        if (data.status === 'completed') {
          const calculator = progressCalculators.current.get(jobId);
          calculator?.complete(() => {
            const transformedResult = adapter.transformResult(data);
            
            if (maxConcurrent === 1) {
              setResult(transformedResult);
              setIsGenerating(false);
              onSuccess?.(transformedResult, jobId);
            } else {
              setCompletedJobs(prev => new Map(prev).set(jobId, transformedResult));
              setActiveJobs(prev => prev.filter(id => id !== jobId));
              
              // 모든 작업 완료 체크
              if (activeJobs.length === 1) {
                setIsGenerating(false);
                onSuccess?.(transformedResult, jobId);
              }
            }
            
            calculator?.destroy();
            progressCalculators.current.delete(jobId);
          });
          
          // 타이머 정리
          const timer = pollingTimers.current.get(jobId);
          if (timer) {
            clearTimeout(timer);
            pollingTimers.current.delete(jobId);
          }
          return;
        }
        
        // 실패 처리
        if (data.status === 'failed') {
          throw new Error(data.error || 'Generation failed');
        }
        
        // 계속 폴링
        if (data.status === 'pending' || data.status === 'processing') {
          const timer = setTimeout(poll, pollingConfig.interval || 2000);
          pollingTimers.current.set(jobId, timer);
        }
        
      } catch (err) {
        retryCount++;
        const maxRetries = pollingConfig.maxRetries || 10;
        
        if (retryCount < maxRetries) {
          // 재시도
          const timer = setTimeout(poll, pollingConfig.interval || 2000);
          pollingTimers.current.set(jobId, timer);
        } else {
          // 최종 실패
          const calculator = progressCalculators.current.get(jobId);
          calculator?.destroy();
          progressCalculators.current.delete(jobId);
          
          const processedError = handleError(err, { jobId });
          const errorMessage = createErrorMessage(processedError);
          
          setError(errorMessage.message);
          setIsGenerating(false);
          onError?.(processedError);
        }
      }
    };
    
    // 1초 후 첫 번째 폴링 시작
    const initialTimer = setTimeout(poll, 1000);
    pollingTimers.current.set(jobId, initialTimer);
    
  }, [adapter, maxConcurrent, activeJobs.length, handleError, createErrorMessage, onSuccess, onError]);

  /**
   * 메인 generate 함수
   */
  const generate = useCallback(async (request: TRequest) => {
    try {
      // 초기화
      setError(null);
      setIsGenerating(true);
      
      if (maxConcurrent === 1) {
        setProgress(1); // 즉시 1%로 시작
        setResult(null);
      } else {
        setMultiProgress(new Map());
        setActiveJobs([]);
        setCompletedJobs(new Map());
      }

      // API 호출
      const apiResponse = await adapter.callAPI(request);

      // 즉시 결과 (동기 방식, ImageBrush 등)
      if (apiResponse.result) {
        const transformedResult = adapter.transformResult(apiResponse.result);
        setResult(transformedResult);
        setProgress(100);
        setIsGenerating(false);
        onSuccess?.(transformedResult);
        return;
      }

      // 비동기 방식 (Polling 필요)
      const jobIds = apiResponse.jobIds || (apiResponse.jobId ? [apiResponse.jobId] : []);
      
      if (jobIds.length === 0) {
        throw new Error('No job IDs received from API');
      }

      setActiveJobs(jobIds);

      // 각 작업별 Progress Calculator와 Polling 시작
      jobIds.forEach(jobId => {
        createProgressCalculator(jobId);
        startPolling(jobId);
      });

    } catch (err) {
      const processedError = handleError(err);
      const errorMessage = createErrorMessage(processedError);
      
      setError(errorMessage.message);
      setIsGenerating(false);
      setProgress(0);
      onError?.(processedError);
      
      // Cleanup
      progressCalculators.current.forEach(calc => calc.destroy());
      progressCalculators.current.clear();
    }
  }, [adapter, maxConcurrent, createProgressCalculator, startPolling, handleError, createErrorMessage, onSuccess, onError]);

  /**
   * 취소
   */
  const cancel = useCallback(() => {
    setIsGenerating(false);
    
    // 모든 polling 타이머 정리
    pollingTimers.current.forEach(timer => clearTimeout(timer));
    pollingTimers.current.clear();
    
    // 모든 calculator 정리
    progressCalculators.current.forEach(calc => calc.destroy());
    progressCalculators.current.clear();
    
    // 상태 초기화
    setProgress(0);
    setMultiProgress(new Map());
    setActiveJobs([]);
  }, []);

  /**
   * 에러 클리어
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * 리셋
   */
  const reset = useCallback(() => {
    cancel();
    setResult(null);
    setCompletedJobs(new Map());
    setError(null);
  }, [cancel]);

  return {
    // 상태
    isGenerating,
    progress,
    error,
    result,
    
    // 다중 작업 지원
    multiProgress,
    activeJobs,
    completedJobs,
    
    // 액션
    generate,
    cancel,
    clearError,
    reset
  };
}

/**
 * 기본 Adapter 구현들
 */

// Video Generation Adapter 예시
export class VideoGenerationAdapter implements GenerationAdapter {
  getProgressConfig() {
    return {
      mode: 'normal' as const,
      expectedDuration: 190
    };
  }

  getPollingConfig(jobId: string) {
    return {
      endpoint: `/api/canvas/jobs/${jobId}`,
      fallbackEndpoint: `/api/canvas/jobs/${jobId}/poll`,
      interval: 2000,
      maxRetries: 150
    };
  }

  async callAPI(request: GenerationRequest) {
    const response = await fetch('/api/canvas/generate-async', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return {
      jobIds: data.jobs?.map((job: { jobId: string }) => job.jobId) || []
    };
  }

  transformResult(apiResult: unknown) {
    const result = apiResult as {
      jobId?: string;
      result?: {
        videoUrl?: string;
        thumbnailUrl?: string;
      };
      modelType?: string;
    };
    
    return {
      id: result.jobId || '',
      url: result.result?.videoUrl || '',
      thumbnail: result.result?.thumbnailUrl || '',
      createdAt: new Date(),
      modelType: result.modelType || 'hailo',
      isFavorite: false
    };
  }
}

// Sound Generation Adapter 예시
export class SoundGenerationAdapter implements GenerationAdapter {
  getProgressConfig() {
    return {
      mode: 'fast' as const,
      expectedDuration: 15
    };
  }

  getPollingConfig(jobId: string) {
    return {
      endpoint: `/api/sound/jobs/${jobId}`,
      fallbackEndpoint: `/api/sound/jobs/${jobId}/poll`,
      interval: 1000,
      maxRetries: 60
    };
  }

  async callAPI(request: GenerationRequest) {
    const response = await fetch('/api/sound/generate-async', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return {
      jobIds: data.jobIds || []
    };
  }

  transformResult(apiResult: unknown) {
    const result = apiResult as {
      jobId?: string;
      result?: {
        audioUrl?: string;
        title?: string;
        duration?: number;
      };
    };
    
    return {
      jobId: result.jobId || '',
      audioUrl: result.result?.audioUrl || '',
      title: result.result?.title || '',
      duration: result.result?.duration || 0,
      createdAt: new Date()
    };
  }
}