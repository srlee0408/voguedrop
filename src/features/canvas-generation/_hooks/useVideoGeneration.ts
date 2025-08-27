/**
 * useVideoGeneration - AI 영상 생성 관리 훅
 * 
 * 주요 역할:
 * 1. AI 영상 생성 프로세스의 전체 생명주기 관리
 * 2. 진행률 추적 및 실시간 상태 업데이트
 * 3. 슬롯 매니저와 연동하여 생성 결과 배치
 * 4. 활성 작업(Active Job) 관리 및 복원 기능
 * 
 * 핵심 특징:
 * - 비동기 영상 생성 API와 폴링 시스템 통합
 * - 슬롯별 생성 진행률 독립 관리
 * - 페이지 새로고침 시 활성 작업 복원 기능
 * - 에러 처리 및 재시도 로직 내장
 * - 생성 완료 시 부드러운 애니메이션 효과
 * 
 * 주의사항:
 * - SlotManager API와 강한 결합으로 인한 의존성
 * - 활성 작업 로컬 스토리지 관리로 인한 데이터 일관성 고려
 * - 폴링 인터벌 관리로 서버 부하 방지 필요
 * - 메모리 누수 방지를 위한 적절한 클린업 처리
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GeneratedVideo } from "@/shared/types/canvas";
import type { SlotContent } from "../_types";
import type { EffectTemplateWithMedia } from "@/shared/types/database";
import { calculateVideoProgress, animateToComplete } from "@/lib/utils/generation-progress";
import { upsert_active_job, update_active_job, remove_active_job, get_active_jobs } from '@/shared/lib/active-jobs';
import { useErrorHandler } from "@/lib/generation/error-handler";

// 통합 Progress 유틸리티 사용으로 기존 함수 제거됨

// 완료 애니메이션도 통합 유틸리티 사용

interface ActiveJobDTO {
  jobId: string;
  imageUrl?: string;
  createdAt?: string;
  modelType?: string;
}

type SlotManagerApi = {
  slotStates: Array<"empty" | "generating" | "completed">;
  findAvailableSlotForGeneration: (imageUrl: string | null) => number;
  setSlotToImage: (slotIndex: number, imageUrl: string) => void;
  markSlotGenerating: (slotIndex: number) => void;
  placeVideoInSlot: (slotIndex: number, video: GeneratedVideo) => void;
  resetSlot: (slotIndex: number) => void;
  /** 현재 슬롯 콘텐츠 스냅샷 제공 (복원 시 매핑에 사용) */
  getSlotContents?: () => Array<SlotContent>;
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
  // 에러 핸들러 초기화
  const { handleError, createErrorMessage } = useErrorHandler('video');
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

  // 마운트 시 활성 작업 복원 및 폴링 재개
  useEffect(() => {
    let is_mounted = true;
    const restore = async () => {
      try {
        const { CanvasAPI } = await import('../_api/api');
        // 서버 기준 진행중 작업 조회 (권위 있는 소스)
        const server_jobs = await CanvasAPI.getActiveJobs();
        // 생성 순서를 보장하기 위해 createdAt 오름차순으로 정렬 (먼저 생성한 것이 먼저 배치)
        const ordered_jobs = [...server_jobs].sort((a: ActiveJobDTO, b: ActiveJobDTO) => {
          const at = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bt = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
          return at - bt;
        });
        if (!is_mounted) return;

        // 클라이언트 저장된 작업
        const local_jobs = get_active_jobs();

        // 각 작업에 대해 슬롯 매핑을 확보하고 진행률 표시 및 폴링 재개
        const usedSlots = new Set<number>();
        for (const j of ordered_jobs) {
          // jobId가 필수
          // 슬롯 매핑: 저장된 정보가 있으면 사용, 없으면 첫 이미지 슬롯 또는 빈 슬롯에 할당
          const saved = local_jobs[j.jobId];
          let slot_index = saved?.slot_index ?? -1;

          // 이미 다른 job과 충돌하는 경우 재배치 필요
          if (slot_index !== -1 && usedSlots.has(slot_index)) {
            slot_index = -1;
          }

          if (slot_index === -1) {
            // 1) 같은 이미지 URL 매칭 (가능하면 원래 자리 보존)
            const imageUrl = j.imageUrl;
            if (imageUrl) {
              const contents = slotManager.getSlotContents ? slotManager.getSlotContents() : [];
              for (let i = 0; i < (contents?.length || 0); i++) {
                const sc = contents[i];
                if (sc?.type === 'image' && sc.data === imageUrl && !usedSlots.has(i)) { slot_index = i; break; }
              }
            }
            // 2) 이미지 슬롯 선호 (URL 불일치여도, 기존 이미지 슬롯을 우선 배정)
            if (slot_index === -1) {
              const contents = slotManager.getSlotContents ? slotManager.getSlotContents() : [];
              for (let i = 0; i < (contents?.length || 0); i++) {
                const sc = contents[i];
                if (sc?.type === 'image' && slotManager.slotStates[i] !== 'generating' && !usedSlots.has(i)) { slot_index = i; break; }
              }
            }
            // 3) 빈 슬롯 배정
            if (slot_index === -1) {
              for (let i = 0; i < slotManager.slotStates.length; i++) {
                if (slotManager.slotStates[i] === 'empty' && !usedSlots.has(i)) { slot_index = i; break; }
              }
            }
            // 4) 모두 사용 중인 경우: 사용되지 않은 첫 슬롯 선택
            if (slot_index === -1) {
              for (let i = 0; i < slotManager.slotStates.length; i++) {
                if (!usedSlots.has(i)) { slot_index = i; break; }
              }
              if (slot_index === -1) slot_index = 0;
            }
          }

          // UI 상태 반영: 해당 슬롯을 generating으로 표시 (이미 비디오가 있으면 유지)
          // 1) 이미지 썸네일을 보장 (복귀 시 검은 화면 방지)
          try {
            const imageUrl = j.imageUrl;
            if (imageUrl) {
              const contents = slotManager.getSlotContents ? slotManager.getSlotContents() : [];
              const current = contents?.[slot_index];
              // 현재 슬롯이 동일 이미지가 아니면 무조건 이미지로 세팅 (검은 화면 방지)
              if (!(current && current.type === 'image' && current.data === imageUrl)) {
                slotManager.setSlotToImage(slot_index, imageUrl);
              }
            }
            // generating 상태 표시
            slotManager.markSlotGenerating(slot_index);
          } catch {
            // 슬롯 매핑 실패는 무시 (UI 레벨에서 progress overlay로 커버)
          }
          
          // 충돌 방지를 위해 사용 슬롯 기록
          usedSlots.add(slot_index);

          setGeneratingSlots(prev => new Set([...prev, slot_index]));
          setIsGenerating(true);
          // 시간 기반 초기 진행률 적용 (즉시 실제치 근사 표시)
          const initial_started_at = (() => {
            const t = j.createdAt ? new Date(j.createdAt).getTime() : undefined;
            return t ?? (saved?.started_at ?? Date.now());
          })();
          const initial_elapsed = Math.max(1, Math.floor((Date.now() - initial_started_at) / 1000));
          const initial_time_progress = Math.floor(calculateVideoProgress(initial_elapsed));
          setGeneratingProgress(prev => {
            const next = new Map(prev);
            const initial = Math.max(1, saved?.last_progress ?? 1, initial_time_progress);
            next.set(slot_index.toString(), initial);
            return next;
          });
          setGeneratingJobIds(prev => {
            const next = new Map(prev);
            next.set(slot_index.toString(), j.jobId);
            return next;
          });

          // active-jobs 동기화
          upsert_active_job(j.jobId, {
            slot_index,
            // 서버 생성 시각을 우선 사용 (시간 기반 진행률 정확도 향상)
            started_at: (() => {
              const t = j.createdAt ? new Date(j.createdAt).getTime() : undefined;
              return t ?? (saved?.started_at ?? Date.now());
            })(),
            last_progress: saved?.last_progress ?? 1,
            image_url: j.imageUrl || ''
          });

          // 폴링 재개
          const job_started_at = (() => {
            const t = j.createdAt ? new Date(j.createdAt).getTime() : undefined;
            return t ?? (saved?.started_at ?? Date.now());
          })();
          const pollOnce = async () => {
            try {
              const statusResponse = await fetch(`/api/canvas/jobs/${j.jobId}`, { cache: 'no-store' });
              if (!statusResponse.ok) return;
              const data = await statusResponse.json();
              if (!is_mounted) return;

              if (data.status === 'processing' || data.status === 'pending') {
                // 시간 기반 진행률로 50% 고정 방지
                const baseline = progressRef.current.get(slot_index.toString()) || 1;
                const elapsedSeconds = Math.max(1, Math.floor((Date.now() - job_started_at) / 1000));
                const timeProgress = Math.floor(calculateVideoProgress(elapsedSeconds));
                const serverRaw = typeof data.progress === 'number' ? data.progress : undefined;
                const serverProgress = (serverRaw !== undefined && serverRaw !== 50)
                  ? serverRaw
                  : (data.status === 'pending' ? 10 : Math.max(baseline, timeProgress));
                const newProgress = Math.max(baseline, serverProgress, timeProgress);
                setGeneratingProgress(prev => {
                  const next = new Map(prev);
                  next.set(slot_index.toString(), newProgress);
                  return next;
                });
                update_active_job(j.jobId, { last_progress: newProgress });
                // 5분 경과 시 fallback endpoint로 강제 확인
                const elapsedMs = Date.now() - job_started_at;
                if (elapsedMs >= 5 * 60 * 1000) {
                  try {
                    const fallbackResp = await fetch(`/api/canvas/jobs/${j.jobId}/poll`, { cache: 'no-store' });
                    if (fallbackResp.ok) {
                      const fb = await fallbackResp.json();
                      if (!is_mounted) return;
                      if (fb.status === 'completed') {
                        const currentProgressValue = progressRef.current.get(slot_index.toString()) || 0;
                        animateToComplete(currentProgressValue, (progress) => {
                          setGeneratingProgress(prev => {
                            const next = new Map(prev);
                            next.set(slot_index.toString(), progress);
                            return next;
                          });
                        });
                        if (fb.result?.videoUrl) {
                          const video = {
                            id: fb.id,
                            url: fb.result.videoUrl,
                            thumbnail: fb.result.thumbnailUrl,
                            createdAt: new Date(fb.createdAt || Date.now()),
                            modelType: (fb.modelType || 'hailo') as 'seedance' | 'hailo',
                            isFavorite: fb.result.isFavorite || false,
                          } as GeneratedVideo;
                          slotManager.placeVideoInSlot(slot_index, video);
                          onVideoCompleted?.(video, slot_index);
                        }
                        // cleanup
                        setGeneratingSlots(prev => {
                          const next = new Set(prev);
                          next.delete(slot_index);
                          if (next.size === 0) setIsGenerating(false);
                          return next;
                        });
                        setGeneratingProgress(prev => {
                          const next = new Map(prev);
                          next.delete(slot_index.toString());
                          return next;
                        });
                        setGeneratingJobIds(prev => {
                          const next = new Map(prev);
                          next.delete(slot_index.toString());
                          return next;
                        });
                        remove_active_job(j.jobId);
                        return; // 종료
                      }
                    }
                  } catch {
                    // fallback 실패 시 다음 루프에서 재시도
                  }
                }
                setTimeout(pollOnce, 3000);
              } else if (data.status === 'completed') {
                const currentProgressValue = progressRef.current.get(slot_index.toString()) || 0;
                animateToComplete(currentProgressValue, (progress) => {
                  setGeneratingProgress(prev => {
                    const next = new Map(prev);
                    next.set(slot_index.toString(), progress);
                    return next;
                  });
                });
                // 결과 비디오 슬롯 배치
                if (data.result?.videoUrl) {
                  const video = {
                    id: data.id,
                    url: data.result.videoUrl,
                    thumbnail: data.result.thumbnailUrl,
                    createdAt: new Date(data.createdAt),
                    modelType: (data.modelType || 'hailo') as 'seedance' | 'hailo',
                    isFavorite: data.result.isFavorite || false,
                  } as GeneratedVideo;
                  slotManager.placeVideoInSlot(slot_index, video);
                  onVideoCompleted?.(video, slot_index);
                }
                // cleanup
                setGeneratingSlots(prev => {
                  const next = new Set(prev);
                  next.delete(slot_index);
                  if (next.size === 0) setIsGenerating(false);
                  return next;
                });
                setGeneratingProgress(prev => {
                  const next = new Map(prev);
                  next.delete(slot_index.toString());
                  return next;
                });
                setGeneratingJobIds(prev => {
                  const next = new Map(prev);
                  next.delete(slot_index.toString());
                  return next;
                });
                remove_active_job(j.jobId);
              } else if (data.status === 'failed') {
                setGenerationError('비디오 생성이 실패했습니다. 다시 시도해주세요.');
                setGeneratingSlots(prev => {
                  const next = new Set(prev);
                  next.delete(slot_index);
                  if (next.size === 0) setIsGenerating(false);
                  return next;
                });
                setGeneratingProgress(prev => {
                  const next = new Map(prev);
                  next.delete(slot_index.toString());
                  return next;
                });
                setGeneratingJobIds(prev => {
                  const next = new Map(prev);
                  next.delete(slot_index.toString());
                  return next;
                });
                slotManager.resetSlot(slot_index);
                remove_active_job(j.jobId);
              }
            } catch {
              // 네트워크 에러는 주기적으로 재시도
              if (!is_mounted) return;
              setTimeout(pollOnce, 3000);
            }
          };
          pollOnce();
        }
      } catch {
        // 복원 실패는 무시
      }
    };
    restore();
    return () => { is_mounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

    // 진행률 초기화 - 즉시 1% 표시
    setGeneratingProgress(prev => {
      const next = new Map(prev);
      next.set(availableSlot.toString(), 1);
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
          next.set(availableSlot.toString(), 1);
          return next;
        });
        setGeneratingJobIds(prev => {
          const next = new Map(prev);
          next.set(availableSlot.toString(), firstJob.jobId);
          return next;
        });
        // 활성 작업 저장 (복원용)
        upsert_active_job(firstJob.jobId, {
          slot_index: availableSlot,
          started_at: Date.now(),
          last_progress: 1,
          image_url: imageUrl,
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
              const target = calculateVideoProgress(elapsedSeconds);
              setGeneratingProgress(prev => {
                const next = new Map(prev);
                const current = prev.get(targetSlot.toString()) || 0;
                next.set(targetSlot.toString(), Math.floor(Math.max(current, target)));
                return next;
              });
              const updated = Math.floor(Math.max(progressRef.current.get(targetSlot.toString()) || 0, target));
              const jobId = generatingJobIds.get(targetSlot.toString());
              if (jobId) update_active_job(jobId, { last_progress: updated });
            }
          } else if (statusData.status === "completed") {
            if (!jobCompletedMap.get(job.jobId)) {
              jobCompletedMap.set(job.jobId, true);
              completionStartTimes.set(job.jobId, Date.now());

              const currentProgressValue = progressRef.current.get(targetSlot.toString()) || 0;
              
              // 통합 유틸리티의 animateToComplete 사용
              animateToComplete(
                currentProgressValue,
                (progress) => {
                  setGeneratingProgress(prev => {
                    const next = new Map(prev);
                    next.set(targetSlot.toString(), progress);
                    return next;
                  });
                }
              );
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
          const newVideos: GeneratedVideo[] = completedJobs
            .filter((job: unknown) => {
              const typedJob = job as { result: { videoUrl?: string } | null };
              return typedJob.result && typedJob.result.videoUrl;
            })
            .map((job: unknown) => {
              const typedJob = job as {
                id: string;
                jobId: string;
                modelType: string;
                result: {
                  videoUrl: string;
                  thumbnailUrl: string;
                  isFavorite?: boolean;
                };
                createdAt: string;
              };
              return {
                id: typedJob.id, // 실제 데이터베이스 ID 사용
                url: typedJob.result.videoUrl,
                thumbnail: typedJob.result.thumbnailUrl,
                createdAt: new Date(typedJob.createdAt),
                modelType: (typedJob.modelType || "hailo") as "seedance" | "hailo",
                isFavorite: typedJob.result.isFavorite || false,
              };
            });
          if (newVideos.length > 0) {
            slotManager.placeVideoInSlot(targetSlot, newVideos[0]);
            onVideoCompleted?.(newVideos[0], targetSlot);
            
            // 🎯 Library에 클립 생성 완료 알림 (실시간 반영)
            if (typeof window !== 'undefined') {
              const eventData = {
                clipId: newVideos[0].id,
                videoUrl: newVideos[0].url,
                thumbnailUrl: newVideos[0].thumbnail,
                timestamp: Date.now(),
                source: 'canvas'
              };

              // 같은 탭 내 통신 (기존 방식)
              const event = new CustomEvent('canvas-clip-completed', {
                detail: eventData
              });
              window.dispatchEvent(event);

              // 다른 탭 간 통신 (BroadcastChannel)
              try {
                const channel = new BroadcastChannel('voguedrop-clips');
                const message = {
                  type: 'canvas-clip-completed',
                  data: eventData
                };
                
                channel.postMessage(message);
                
                // 채널 닫기 전에 잠시 대기
                setTimeout(() => {
                  channel.close();
                }, 100);
                
              } catch {
                // BroadcastChannel 에러 시 무시
              }
            }
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
          const finishedJobId = generatingJobIds.get(targetSlot.toString());
          if (finishedJobId) remove_active_job(finishedJobId);

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

      // 즉시 polling 시작 - 3초 대기 제거
      pollJobs(availableSlot);
    } catch (error: unknown) {
      console.error("Video generation error:", error);
      
      // 통합 에러 핸들러 사용
      const processedError = handleError(error, {
        jobId: `video-${availableSlot}-${Date.now()}`
      });
      const errorMessage = createErrorMessage(processedError);
      
      setGenerationError(errorMessage.message);

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
  }, [getCurrentImage, selectedEffects, promptText, selectedDuration, slotManager, onVideoCompleted, handleError, createErrorMessage, generatingJobIds]);

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

