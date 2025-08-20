import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GeneratedVideo } from "@/types/canvas";
import type { EffectTemplateWithMedia } from "@/types/database";

/**
 * 진행률 계산: 경과 시간 기반으로 0~90% 구간을 부드럽게 증가
 */
const calculateProgressForElapsedTime = (elapsedSeconds: number, expectedDuration: number = 190): number => {
  const checkpoints = [
    { time: 10, progress: 5 },
    { time: 30, progress: 15 },
    { time: 60, progress: 30 },
    { time: 100, progress: 50 },
    { time: 140, progress: 70 },
    { time: 170, progress: 83 },
    { time: 190, progress: 90 },
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
          targetProgress = checkpoint.progress + progressDiff * timeRatio;
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

  const smoothIncrement = 0.1 + Math.random() * 0.2;
  targetProgress += smoothIncrement;
  return Math.min(targetProgress, 90);
};

/**
 * 완료 애니메이션 시간 계산: 남은 진행률이 많을수록 더 오래
 */
const calculateCompletionAnimationDuration = (currentProgress: number): number => {
  const remainingProgress = 100 - currentProgress;
  return Math.min(3000, Math.max(500, (remainingProgress / 100) * 3000));
};

type SlotManagerApi = {
  slotStates: Array<"empty" | "generating" | "completed">;
  findAvailableSlotForGeneration: (imageUrl: string | null) => number;
  setSlotToImage: (slotIndex: number, imageUrl: string) => void;
  markSlotGenerating: (slotIndex: number) => void;
  placeVideoInSlot: (slotIndex: number, video: GeneratedVideo) => void;
  resetSlot: (slotIndex: number) => void;
};

interface UseVideoGenerationArgs {
  getCurrentImage: () => string | null;
  selectedEffects: EffectTemplateWithMedia[];
  promptText: string;
  selectedDuration: string;
  slotManager: SlotManagerApi;
  onVideoCompleted?: (video: GeneratedVideo, slotIndex: number) => void;
}

/**
 * 비디오 생성/폴링/진행률/에러를 관리하는 훅
 */
export function useVideoGeneration({
  getCurrentImage,
  selectedEffects,
  promptText,
  selectedDuration,
  slotManager,
  onVideoCompleted,
}: UseVideoGenerationArgs) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingProgress, setGeneratingProgress] = useState<Map<string, number>>(new Map());
  const [generatingJobIds, setGeneratingJobIds] = useState<Map<string, string>>(new Map());
  const [generatingSlots, setGeneratingSlots] = useState<Set<number>>(new Set());
  const [generationError, setGenerationError] = useState<string | null>(null);

  // 최신 상태 보관용 ref (타이머 콜백에서 안전하게 사용)
  const progressRef = useRef(generatingProgress);
  useEffect(() => {
    progressRef.current = generatingProgress;
  }, [generatingProgress]);

  // 에러 자동 제거
  useEffect(() => {
    if (!generationError) return;
    const t = setTimeout(() => setGenerationError(null), 5000);
    return () => clearTimeout(t);
  }, [generationError]);

  const isSlotGenerating = useCallback((slotIndex: number) => {
    return progressRef.current.has(slotIndex.toString());
  }, []);

  const canGenerate = useMemo(() => {
    const imageUrl = getCurrentImage();
    const hasPromptOrEffect = selectedEffects.length > 0 || promptText.trim().length > 0;
    const concurrentLimitOk = generatingSlots.size < 2; // 동시 2개 제한
    return !!imageUrl && hasPromptOrEffect && concurrentLimitOk;
  }, [getCurrentImage, selectedEffects, promptText, generatingSlots.size]);

  /**
   * 비디오 생성 시작 핸들러
   */
  const generateVideo = useCallback(async () => {
    const imageUrl = getCurrentImage();
    if (!imageUrl) {
      setGenerationError("Please upload an image first.");
      return;
    }
    if (selectedEffects.length === 0 && !promptText.trim()) {
      setGenerationError("Please select at least one effect or enter a prompt.");
      return;
    }

    // 동시 생성 2개 제한 (슬롯 상태 기준)
    const generatingCount = slotManager.slotStates.filter(s => s === "generating").length;
    if (generatingCount >= 2) {
      setGenerationError("최대 2개까지 동시 생성이 가능합니다.");
      return;
    }

    // 배치할 슬롯 선택
    const availableSlot = slotManager.findAvailableSlotForGeneration(imageUrl);
    if (availableSlot === -1) {
      setGenerationError("사용 가능한 슬롯이 없습니다.");
      return;
    }

    // UI 선반영
    slotManager.setSlotToImage(availableSlot, imageUrl);
    slotManager.markSlotGenerating(availableSlot);
    setGeneratingSlots(prev => new Set([...prev, availableSlot]));
    setIsGenerating(true);
    setGenerationError(null);

    // 진행률 초기화
    setGeneratingProgress(prev => {
      const next = new Map(prev);
      next.set(availableSlot.toString(), 0);
      return next;
    });
    setGeneratingJobIds(prev => {
      const next = new Map(prev);
      next.set(availableSlot.toString(), `pending-${availableSlot}`);
      return next;
    });

    try {
      // 1. 비동기 생성 요청
      const response = await fetch("/api/canvas/generate-async", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl,
          effectIds: selectedEffects.map(e => e.id),
          basePrompt: promptText,
          duration: selectedDuration,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Video generation failed.");
      }

      const jobStartTimes = new Map<string, number>();
      const jobCompletedMap = new Map<string, boolean>();
      const completionStartTimes = new Map<string, number>();

      if (data.jobs && data.jobs.length > 0) {
        const firstJob = data.jobs[0];
        setGeneratingProgress(prev => {
          const next = new Map(prev);
          next.set(availableSlot.toString(), 0);
          return next;
        });
        setGeneratingJobIds(prev => {
          const next = new Map(prev);
          next.set(availableSlot.toString(), firstJob.jobId);
          return next;
        });
        jobStartTimes.set(firstJob.jobId, Date.now());
        jobCompletedMap.set(firstJob.jobId, false);
      }

      // 2. 폴링
      const pollJobs = async (targetSlot: number) => {
        const pollPromises = (data.jobs as Array<{ jobId: string }>).map(async job => {
          const jobStartTime = jobStartTimes.get(job.jobId) || Date.now();
          const elapsedTime = Date.now() - jobStartTime;
          const elapsedMinutes = Math.floor(elapsedTime / 60000);

          // 5분 경과시 webhook 확인 및 직접 폴링
          if (elapsedMinutes >= 5 && elapsedTime % 60000 < 2000) {
            const webhookCheckResponse = await fetch(`/api/canvas/jobs/${job.jobId}/check-webhook`);
            const webhookCheckData = await webhookCheckResponse.json();
            if (webhookCheckData.webhookCheckRequired) {
              const pollResponse = await fetch(`/api/canvas/jobs/${job.jobId}/poll`);
              const pollData = await pollResponse.json();
              if (pollData.status === "completed" || pollData.status === "failed") {
                return pollData;
              }
            }
          }

          // 일반 상태
          const statusResponse = await fetch(`/api/canvas/jobs/${job.jobId}`);
          const statusData = await statusResponse.json();

          if (statusData.status === "processing") {
            if (!jobCompletedMap.get(job.jobId)) {
              const now = Date.now();
              const start = jobStartTimes.get(job.jobId) || now;
              const elapsedSeconds = (now - start) / 1000;
              const target = calculateProgressForElapsedTime(elapsedSeconds);
              setGeneratingProgress(prev => {
                const next = new Map(prev);
                const current = prev.get(targetSlot.toString()) || 0;
                next.set(targetSlot.toString(), Math.floor(Math.max(current, target)));
                return next;
              });
            }
          } else if (statusData.status === "completed") {
            if (!jobCompletedMap.get(job.jobId)) {
              jobCompletedMap.set(job.jobId, true);
              completionStartTimes.set(job.jobId, Date.now());

              const currentProgressValue = progressRef.current.get(targetSlot.toString()) || 0;
              const animationDuration = calculateCompletionAnimationDuration(currentProgressValue);

              const animateToComplete = () => {
                const startTime = completionStartTimes.get(job.jobId) || Date.now();
                const elapsed = Date.now() - startTime;
                const ratio = Math.min(elapsed / animationDuration, 1);
                const easeOut = 1 - Math.pow(1 - ratio, 3);
                setGeneratingProgress(prev => {
                  const next = new Map(prev);
                  const start = currentProgressValue;
                  const target = start + (100 - start) * easeOut;
                  next.set(targetSlot.toString(), Math.floor(target));
                  return next;
                });
                if (ratio < 1) {
                  setTimeout(animateToComplete, 16);
                }
              };
              animateToComplete();
            }
          }

          return statusData;
        });

        const jobStatuses = await Promise.all(pollPromises);

        // 완료된 비디오 처리
        const completedJobs = jobStatuses.filter((j: unknown) => {
          const job = j as { status: string };
          return job.status === "completed";
        });
        if (completedJobs.length > 0) {
          const newVideos: GeneratedVideo[] = completedJobs.map((job: unknown) => {
            const typedJob = job as {
              jobId: string;
              result: {
                videoUrl: string;
                thumbnailUrl: string;
                isFavorite?: boolean;
              };
              createdAt: string;
              modelType: string;
            };
            return {
              id: typedJob.jobId,
              url: typedJob.result.videoUrl,
              thumbnail: typedJob.result.thumbnailUrl,
              createdAt: new Date(typedJob.createdAt),
              modelType: typedJob.modelType as "seedance" | "hailo",
              isFavorite: typedJob.result.isFavorite || false,
            };
          });
          if (newVideos.length > 0) {
            slotManager.placeVideoInSlot(targetSlot, newVideos[0]);
            onVideoCompleted?.(newVideos[0], targetSlot);
          }
        }

        // 진행 중 작업 여부
        const processingJobs = jobStatuses.filter((j: unknown) => {
          const job = j as { status: string };
          return job.status === "pending" || job.status === "processing";
        });
        if (processingJobs.length > 0) {
          setTimeout(() => pollJobs(targetSlot), 3000);
        } else {
          // cleanup
          setGeneratingSlots(prev => {
            const next = new Set(prev);
            next.delete(targetSlot);
            if (next.size === 0) setIsGenerating(false);
            return next;
          });
          setGeneratingProgress(prev => {
            const next = new Map(prev);
            next.delete(targetSlot.toString());
            return next;
          });
          setGeneratingJobIds(prev => {
            const next = new Map(prev);
            next.delete(targetSlot.toString());
            return next;
          });

          const failedJobs = jobStatuses.filter((j: unknown) => {
            const job = j as { status: string };
            return job.status === "failed";
          });
          if (failedJobs.length === jobStatuses.length) {
            setGenerationError("All video generation attempts failed.");
            slotManager.resetSlot(targetSlot);
          }
        }
      };

      setTimeout(() => pollJobs(availableSlot), 3000);
    } catch (error: unknown) {
      console.error("Video generation error:", error);
      const errorMessage = error instanceof Error ? error.message : "An error occurred during video generation.";
      setGenerationError(errorMessage);

      // 해당 슬롯만 롤백/정리
      slotManager.resetSlot(availableSlot);
      setGeneratingSlots(prev => {
        const next = new Set(prev);
        next.delete(availableSlot);
        if (next.size === 0) setIsGenerating(false);
        return next;
      });
      setGeneratingProgress(prev => {
        const next = new Map(prev);
        next.delete(availableSlot.toString());
        return next;
      });
      setGeneratingJobIds(prev => {
        const next = new Map(prev);
        next.delete(availableSlot.toString());
        return next;
      });
    }
  }, [getCurrentImage, selectedEffects, promptText, selectedDuration, slotManager, onVideoCompleted]);

  return {
    isGenerating,
    generatingProgress,
    generatingJobIds,
    generatingSlots,
    generationError,
    canGenerate,
    isSlotGenerating,
    generateVideo,
    setGenerationError,
  } as const;
}

