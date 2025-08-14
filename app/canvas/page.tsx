"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Header } from "@/components/layout/Header"
import { LeftPanel } from "./_components/LeftPanel"
import { Canvas } from "./_components/Canvas"
import { LibraryModal } from "@/components/modals/LibraryModal"
import { EffectModal } from "@/components/modals/EffectModal"
import { PromptModal } from "@/components/modals/PromptModal"
import { CameraModal } from "@/components/modals/CameraModal"
import { ModelModal } from "@/components/modals/ModelModal"
import { ProjectTitleModal } from "@/components/modals/ProjectTitleModal"
import { useRouter } from "next/navigation"
import type { GeneratedVideo } from "@/types/canvas"
import type { EffectTemplateWithMedia } from "@/types/database"
import { useBeforeUnload } from "./_hooks/useBeforeUnload"
import { EffectsDataProvider } from "./_hooks/useEffectsData"
import { useAuth } from "@/lib/auth/AuthContext"

// 진행률 계산 유틸리티 함수들
const calculateProgressForElapsedTime = (elapsedSeconds: number, expectedDuration: number = 190): number => {
  // 체크포인트 기반 진행률 계산 (최대 90%까지만)
  const checkpoints = [
    { time: 10, progress: 5 },
    { time: 30, progress: 15 },
    { time: 60, progress: 30 },
    { time: 100, progress: 50 },
    { time: 140, progress: 70 },
    { time: 170, progress: 83 },
    { time: 190, progress: 90 }
  ];
  
  let targetProgress = 0;
  
  // 현재 시간에 해당하는 체크포인트 찾기
  for (let i = 0; i < checkpoints.length; i++) {
    const checkpoint = checkpoints[i];
    const nextCheckpoint = checkpoints[i + 1];
    
    if (elapsedSeconds >= checkpoint.time) {
      if (!nextCheckpoint || elapsedSeconds < nextCheckpoint.time) {
        // 현재 체크포인트와 다음 체크포인트 사이
        if (nextCheckpoint) {
          const timeRatio = (elapsedSeconds - checkpoint.time) / (nextCheckpoint.time - checkpoint.time);
          const progressDiff = nextCheckpoint.progress - checkpoint.progress;
          targetProgress = checkpoint.progress + (progressDiff * timeRatio);
        } else {
          // 마지막 체크포인트 이후
          targetProgress = checkpoint.progress;
        }
        break;
      }
    } else if (i === 0) {
      // 첫 체크포인트 이전
      targetProgress = (elapsedSeconds / checkpoint.time) * checkpoint.progress;
      break;
    }
  }
  
  // 예상 시간 초과 시 처리
  if (elapsedSeconds > expectedDuration) {
    // 90%에서 천천히 감속 (85-90% 사이 유지)
    const overtime = elapsedSeconds - expectedDuration;
    const slowdown = Math.log(1 + overtime / expectedDuration) * 2;
    targetProgress = Math.max(85, 90 - slowdown);
  }
  
  // 부드러운 증가를 위한 작은 증분 추가 (0.1-0.3%)
  const smoothIncrement = 0.1 + (Math.random() * 0.2);
  targetProgress += smoothIncrement;
  
  // 90% 상한선 적용
  return Math.min(targetProgress, 90);
};

const calculateCompletionAnimationDuration = (currentProgress: number): number => {
  // 애니메이션 시간 동적 계산
  // 진행률이 낮을수록 더 긴 애니메이션 시간 (최대 3초)
  // 진행률이 높을수록 더 짧은 애니메이션 시간 (최소 0.5초)
  const remainingProgress = 100 - currentProgress;
  return Math.min(3000, Math.max(500, (remainingProgress / 100) * 3000));
};

export default function CanvasPage() {
  const router = useRouter()
  const [isLibraryOpen, setIsLibraryOpen] = useState(false)
  const [isEffectModalOpen, setIsEffectModalOpen] = useState(false)
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false)
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false)
  const [isModelModalOpen, setIsModelModalOpen] = useState(false)
  const [isProjectTitleModalOpen, setIsProjectTitleModalOpen] = useState(false)
  const [isPrompterOpen, setIsPrompterOpen] = useState(false)
  const [promptText, setPromptText] = useState("")
  const [negativePrompt, setNegativePrompt] = useState("")
  const [selectedResolution] = useState("1:1")
  const [selectedSize] = useState("1024×1024")
  const [selectedModelId, setSelectedModelId] = useState<string>("")
  // FIFO 방식 슬롯 콘텐츠 관리
  const [slotContents, setSlotContents] = useState<Array<{type: 'image' | 'video', data: string | GeneratedVideo} | null>>([null, null, null, null])
  const [currentGeneratingImage, setCurrentGeneratingImage] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedEffects, setSelectedEffects] = useState<EffectTemplateWithMedia[]>([])
  const [generationError, setGenerationError] = useState<string | null>(null)
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null)
  const [selectedDuration, setSelectedDuration] = useState<string>("6")
  const [generatingProgress, setGeneratingProgress] = useState<Map<string, number>>(new Map())
  const [generatingJobIds, setGeneratingJobIds] = useState<Map<string, string>>(new Map())
  const [generatingSlots, setGeneratingSlots] = useState<Set<number>>(new Set())
  const [slotStates, setSlotStates] = useState<Array<'empty' | 'generating' | 'completed'>>(['empty', 'empty', 'empty', 'empty'])
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null)
  const [activeVideo, setActiveVideo] = useState<GeneratedVideo | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [favoriteVideos, setFavoriteVideos] = useState<Set<string>>(new Set())
  // 각 슬롯의 완료 시점을 기록하여 '가장 오래된 completed 교체' 규칙을 구현
  const [slotCompletedAt, setSlotCompletedAt] = useState<Array<number | null>>([null, null, null, null])
  const { user } = useAuth()
  
  // 페이지 이탈 방지
  useBeforeUnload(isGenerating, 'Video generation is in progress. Leaving the page will cancel the generation.')
  
  // 초기 즐겨찾기 상태 로드
  useEffect(() => {
    async function loadFavorites() {
      if (!user) return
      
      try {
        const response = await fetch('/api/canvas/favorites')
        if (!response.ok) {
          throw new Error('Failed to fetch favorites')
        }
        
        const data = await response.json()
        if (data.favoriteIds) {
          setFavoriteVideos(new Set(data.favoriteIds))
        }
      } catch (error) {
        console.error('Failed to load favorites:', error)
      }
    }
    
    loadFavorites()
  }, [user])
  
  // 에러 메시지 자동 제거
  useEffect(() => {
    if (generationError) {
      const timer = setTimeout(() => {
        setGenerationError(null);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [generationError]);

  const handleEffectSelect = (effect: EffectTemplateWithMedia) => {
    setSelectedEffects(prev => {
      const isSelected = prev.some(e => e.id === effect.id);
      if (isSelected) {
        // Deselect
        return prev.filter(e => e.id !== effect.id);
      } else {
        // Add selection (최대 2개까지만)
        if (prev.length >= 2) {
          // 첫 번째 요소를 제거하고 새로운 것을 추가
          return [...prev.slice(1), effect];
        }
        return [...prev, effect];
      }
    });
  };

  const handleEffectRemove = (effectId: number) => {
    setSelectedEffects(prev => prev.filter(e => e.id !== effectId));
  };

  const handleVideoSelect = (video: GeneratedVideo) => {
    // 이미 슬롯에 있는 비디오인지 확인: 이미 있으면 제거(토글)
    const existingIndex = slotContents.findIndex(slot => 
      slot?.type === 'video' && (slot.data as GeneratedVideo).id === video.id
    );
    if (existingIndex !== -1) {
      setSlotContents(prev => {
        const newSlots = [...prev];
        newSlots[existingIndex] = null;
        return newSlots;
      });
      setSlotStates(prev => {
        const newStates = [...prev];
        newStates[existingIndex] = 'empty';
        return newStates;
      });
      setSlotCompletedAt(prev => {
        const newTimes = [...prev];
        newTimes[existingIndex] = null;
        return newTimes;
      });
      if (video.id === selectedVideoId) {
        setSelectedVideoId(null);
        setActiveVideo(null);
        setSelectedSlotIndex(null);
      }
      return;
    }
    
    setSelectedVideoId(video.id);
    
    // 1) 빈 슬롯 우선 (slotContents 기준)
    let targetSlot = -1;
    for (let i = 0; i < 4; i++) {
      if (!slotContents[i]) {
        targetSlot = i;
        break;
      }
    }

    // 2) 이미지 슬롯 교체 (generating 제외 - 진행 중 판단은 generatingProgress 기준)
    if (targetSlot === -1) {
      for (let i = 0; i < 4; i++) {
        const isGeneratingSlot = generatingProgress.has(i.toString());
        if (slotContents[i]?.type === 'image' && !isGeneratingSlot) {
          targetSlot = i;
          break;
        }
      }
    }

    // 3) 가장 오래된 비디오 슬롯 교체 (completed 개념을 콘텐츠로 판단)
    if (targetSlot === -1) {
      const videoIndices: number[] = []
      for (let i = 0; i < 4; i++) {
        if (slotContents[i]?.type === 'video') videoIndices.push(i)
      }
      if (videoIndices.length > 0) {
        let chosenIndex = videoIndices[0]
        let chosenTime = slotCompletedAt[chosenIndex]
        for (let i = 1; i < videoIndices.length; i++) {
          const idx = videoIndices[i]
          const t = slotCompletedAt[idx]
          if (t !== null && (chosenTime === null || t < chosenTime)) {
            chosenIndex = idx
            chosenTime = t
          }
        }
        targetSlot = chosenIndex
      }
    }
    
    // 모든 슬롯이 generating 상태이면 선택 불가
    if (targetSlot === -1) {
      setGenerationError('생성 중인 작업이 완료되길 기다려주세요.');
      return;
    }

    // 슬롯에 배치
    if (targetSlot !== -1) {
      setSlotContents(prev => {
        const newSlots = [...prev];
        newSlots[targetSlot] = { type: 'video', data: video };
        return newSlots;
      });
      
      setSlotStates(prev => {
        const newStates = [...prev];
        newStates[targetSlot] = 'completed';
        return newStates;
      });
      
      // 완료 시점 기록
      setSlotCompletedAt(prev => {
        const newTimes = [...prev];
        newTimes[targetSlot] = Date.now();
        return newTimes;
      });
    }
  };

  // Generate 버튼 활성화 조건 계산
  // 이미지가 있고, 효과나 프롬프트가 있으며, 3개 미만이 생성 중일 때
  const canGenerate = !!currentGeneratingImage && 
    (selectedEffects.length > 0 || promptText.trim().length > 0) &&
    generatingSlots.size < 2;

  // 콘텐츠 제거 핸들러
  const handleRemoveContent = (index: number, type: 'image' | 'video') => {
    // 단순히 해당 슬롯만 비우고 순서 유지
    setSlotContents(prev => {
      const newSlots = [...prev];
      newSlots[index] = null;
      return newSlots;
    });
    
    // 해당 슬롯의 상태를 'empty'로 변경
    setSlotStates(prev => {
      const newStates = [...prev];
      newStates[index] = 'empty';
      return newStates;
    });

    // 완료 시점 초기화
    setSlotCompletedAt(prev => {
      const newTimes = [...prev];
      newTimes[index] = null;
      return newTimes;
    });
    
    // 첫 번째 슬롯의 이미지가 제거되면 currentGeneratingImage도 초기화
    if (index === 0 && type === 'image') {
      setCurrentGeneratingImage(null);
    }
  };

  const handleGenerateVideo = async () => {
    if (!currentGeneratingImage) {
      setGenerationError('Please upload an image first.');
      return;
    }

    if (selectedEffects.length === 0 && !promptText.trim()) {
      setGenerationError('Please select at least one effect or enter a prompt.');
      return;
    }

    // 3개 제한 체크 (전체 슬롯에서 generating 상태 확인)
    const generatingCount = slotStates.filter(state => state === 'generating').length;
    if (generatingCount >= 3) {
      setGenerationError('최대 3개까지 동시 생성이 가능합니다.');
      return;
    }

    // currentGeneratingImage와 일치하는 이미지 슬롯 찾기
    let availableSlot = -1;
    
    // 1순위: currentGeneratingImage와 일치하는 이미지 슬롯 찾기
    for (let i = 0; i < 4; i++) {
      const slot = slotContents[i];
      if (slot?.type === 'image' && 
          slot.data === currentGeneratingImage &&
          slotStates[i] === 'empty') {
        availableSlot = i;
        break;
      }
    }

    // 2순위: 빈 슬롯 찾기
    if (availableSlot === -1) {
      for (let i = 0; i < 4; i++) {
        if (slotStates[i] === 'empty' && !slotContents[i]) {
          availableSlot = i;
          break;
        }
      }
    }

    // 3순위: completed 슬롯 찾기 (가장 오래된 완료 시점 기준)
    if (availableSlot === -1) {
      const completedIndices: number[] = []
      for (let i = 0; i < 4; i++) {
        if (slotStates[i] === 'completed') completedIndices.push(i)
      }
      if (completedIndices.length > 0) {
        let chosenIndex = completedIndices[0]
        let chosenTime = slotCompletedAt[chosenIndex]
        for (let i = 1; i < completedIndices.length; i++) {
          const idx = completedIndices[i]
          const t = slotCompletedAt[idx]
          if (t !== null && (chosenTime === null || t < chosenTime)) {
            chosenIndex = idx
            chosenTime = t
          }
        }
        availableSlot = chosenIndex
      }
    }

    if (availableSlot === -1) {
      setGenerationError('사용 가능한 슬롯이 없습니다.');
      return;
    }

    // 기존 콘텐츠 재배치 없이, 생성할 이미지 썸네일을 해당 슬롯에 바로 배치
    setSlotContents(prev => {
      const newSlots = [...prev];
      newSlots[availableSlot] = { type: 'image', data: currentGeneratingImage };
      return newSlots;
    });

    // 이미지가 들어온 슬롯의 완료 시점 리셋
    setSlotCompletedAt(prev => {
      const newTimes = [...prev]
      newTimes[availableSlot] = null
      return newTimes
    })

    // 슬롯 상태 업데이트: 생성 중인 슬롯만 generating으로 설정
    setSlotStates(prev => {
      const newStates = [...prev];
      newStates[availableSlot] = 'generating';
      return newStates;
    });
    
    // generatingSlots도 유지 (기존 로직과 호환)
    setGeneratingSlots(prev => new Set([...prev, availableSlot]));
    setIsGenerating(true);
    setGenerationError(null);
    
    // LeftPanel 이미지를 유지하여 연속 생성 가능

    // 진행률 맵 초기화 - availableSlot을 키로 사용
    const initialProgressMap = new Map<string, number>();
    const initialJobIdsMap = new Map<string, string>();
    
    // 슬롯을 0%로 초기화 (효과가 여러 개여도 하나의 진행률만 추적)
    initialProgressMap.set(availableSlot.toString(), 0);
    initialJobIdsMap.set(availableSlot.toString(), `pending-${availableSlot}`);
    
    setGeneratingProgress(initialProgressMap);
    setGeneratingJobIds(initialJobIdsMap);

    try {
      // 1. 비동기 작업 시작
      const response = await fetch('/api/canvas/generate-async', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: currentGeneratingImage,
          effectIds: selectedEffects.map(effect => effect.id),
          basePrompt: promptText,
          duration: selectedDuration,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Video generation failed.');
      }

      // 진행률 관련 맵 업데이트
      const progressMap = new Map<string, number>();
      const jobIdsMap = new Map<string, string>();
      const jobStartTimes = new Map<string, number>(); // 작업 시작 시간 기록
      const jobCompletedMap = new Map<string, boolean>(); // 완료 상태 추적
      const completionStartTimes = new Map<string, number>(); // 완료 애니메이션 시작 시간
      
      // 첫 번째 job만 추적 (여러 효과가 있어도 하나의 작업으로 처리)
      if (data.jobs && data.jobs.length > 0) {
        const firstJob = data.jobs[0];
        progressMap.set(availableSlot.toString(), 0);
        jobIdsMap.set(availableSlot.toString(), firstJob.jobId);
        jobStartTimes.set(firstJob.jobId, Date.now());
        jobCompletedMap.set(firstJob.jobId, false);
      }
      setGeneratingProgress(progressMap);
      setGeneratingJobIds(jobIdsMap);

      // 2. 폴링 시작
      const pollJobs = async (targetSlot: number) => {
        const pollPromises = data.jobs
          .map(async (job: { jobId: string }, originalIndex: number) => {
            const jobStartTime = jobStartTimes.get(job.jobId) || Date.now();
            const elapsedTime = Date.now() - jobStartTime;
            const elapsedMinutes = Math.floor(elapsedTime / 60000);
            
            // UI 상태 업데이트
            
            // 5분 경과 체크
            if (elapsedMinutes >= 5 && elapsedTime % 60000 < 2000) { // 매 분마다 한 번만 체크
              
              // webhook 상태 확인
              const webhookCheckResponse = await fetch(`/api/canvas/jobs/${job.jobId}/check-webhook`);
              const webhookCheckData = await webhookCheckResponse.json();
              
              
              if (webhookCheckData.webhookCheckRequired) {
                
                // poll 엔드포인트로 fal.ai 상태 직접 확인
                const pollResponse = await fetch(`/api/canvas/jobs/${job.jobId}/poll`);
                const pollData = await pollResponse.json();
                
                
                if (pollData.status === 'completed' || pollData.status === 'failed') {
                  return { ...pollData, originalIndex };
                }
              }
            }
            
            // 일반 상태 확인
            const statusResponse = await fetch(`/api/canvas/jobs/${job.jobId}`);
            const statusData = await statusResponse.json();
            
            // 진행률 업데이트
            if (statusData.status === 'processing') {
              // 완료되지 않은 작업만 진행률 업데이트
              if (!jobCompletedMap.get(job.jobId)) {
                const currentTime = Date.now();
                const startTime = jobStartTimes.get(job.jobId) || currentTime;
                const elapsedSeconds = (currentTime - startTime) / 1000;
                
                // 유틸리티 함수를 사용하여 진행률 계산
                const targetProgress = calculateProgressForElapsedTime(elapsedSeconds);
                
                setGeneratingProgress(prev => {
                  const newMap = new Map(prev);
                  const currentProgress = prev.get(targetSlot.toString()) || 0;
                  // 이전 값보다 큰 경우에만 업데이트 (단조 증가 보장)
                  const newProgress = Math.max(currentProgress, targetProgress);
                  newMap.set(targetSlot.toString(), Math.floor(newProgress));
                  return newMap;
                });
              }
            } else if (statusData.status === 'completed') {
              // 완료 시 동적 애니메이션 시작
              if (!jobCompletedMap.get(job.jobId)) {
                jobCompletedMap.set(job.jobId, true);
                completionStartTimes.set(job.jobId, Date.now());
                
                // 현재 진행률 가져오기
                const currentProgressValue = generatingProgress.get(targetSlot.toString()) || 0;
                
                // 유틸리티 함수를 사용하여 애니메이션 시간 계산
                const animationDuration = calculateCompletionAnimationDuration(currentProgressValue);
                
                
                // 완료 애니메이션
                const animateToComplete = () => {
                  const startTime = completionStartTimes.get(job.jobId) || Date.now();
                  const elapsed = Date.now() - startTime;
                  const ratio = Math.min(elapsed / animationDuration, 1);
                  
                  // easeOut 효과
                  const easeOut = 1 - Math.pow(1 - ratio, 3);
                  
                  setGeneratingProgress(prev => {
                    const newMap = new Map(prev);
                    const startProgress = currentProgressValue;
                    const targetProgress = startProgress + (100 - startProgress) * easeOut;
                    newMap.set(targetSlot.toString(), Math.floor(targetProgress));
                    return newMap;
                  });
                  
                  if (ratio < 1) {
                    setTimeout(animateToComplete, 16); // 60fps
                  }
                };
                
                animateToComplete();
              }
            }
            
            return { ...statusData, originalIndex };
          });

        const jobStatuses = await Promise.all(pollPromises);
        
        // 완료된 비디오 처리
        const completedJobs = jobStatuses.filter(job => job.status === 'completed');
        
        if (completedJobs.length > 0) {
          const newVideos: GeneratedVideo[] = completedJobs.map(job => ({
            id: job.jobId,
            url: job.result.videoUrl,
            thumbnail: job.result.thumbnailUrl,
            createdAt: new Date(job.createdAt),
            modelType: job.modelType as "seedance" | "hailo",
            isFavorite: job.result.isFavorite || false
          }));

          // 생성 완료 시 썸네일을 비디오로 교체
          if (newVideos.length > 0) {
            setSlotContents(prev => {
              const newSlots = [...prev];
              // 이미지 썸네일을 실제 비디오로 교체
              newSlots[targetSlot] = { type: 'video', data: newVideos[0] };
              return newSlots;
            });
            
            // 슬롯 상태를 completed로 변경
            setSlotStates(prev => {
              const newStates = [...prev];
              newStates[targetSlot] = 'completed';
              return newStates;
            });
            // 완료 시점 기록
            setSlotCompletedAt(prev => {
              const newTimes = [...prev];
              newTimes[targetSlot] = Date.now();
              return newTimes;
            });
          }

          // 첫 번째 비디오 선택
          if (newVideos.length > 0 && !selectedVideoId) {
            setSelectedVideoId(newVideos[0].id);
          }
        }

        // 아직 처리 중인 작업이 있으면 계속 폴링
        const processingJobs = jobStatuses.filter(
          job => job.status === 'pending' || job.status === 'processing'
        );

        if (processingJobs.length > 0) {
          setTimeout(() => pollJobs(targetSlot), 3000); // 3초 후 다시 확인
        } else {
          // generatingSlots에서 제거 + 남은 작업 없으면 isGenerating 해제
          setGeneratingSlots(prev => {
            const newSet = new Set(prev);
            newSet.delete(targetSlot);
            if (newSet.size === 0) {
              setIsGenerating(false);
            }
            return newSet;
          });
          
          // 해당 슬롯의 진행률만 제거
          setGeneratingProgress(prev => {
            const newMap = new Map(prev);
            newMap.delete(targetSlot.toString());
            return newMap;
          });
          setGeneratingJobIds(prev => {
            const newMap = new Map(prev);
            newMap.delete(targetSlot.toString());
            return newMap;
          });
          
          const failedJobs = jobStatuses.filter(job => job.status === 'failed');
          if (failedJobs.length === jobStatuses.length) {
            setGenerationError('All video generation attempts failed.');
            // 실패한 경우 슬롯 상태를 다시 empty로 변경
            setSlotStates(prev => {
              const newStates = [...prev];
              newStates[targetSlot] = 'empty';
              return newStates;
            });
            // 실패한 경우 슬롯 콘텐츠도 제거
            setSlotContents(prev => {
              const newSlots = [...prev];
              newSlots[targetSlot] = null;
              return newSlots;
            });
            // 완료 시점 초기화
            setSlotCompletedAt(prev => {
              const newTimes = [...prev];
              newTimes[targetSlot] = null;
              return newTimes;
            });
          }
        }
      };

      // 폴링 시작
      setTimeout(() => pollJobs(availableSlot), 3000);
      
    } catch (error) {
      console.error('Video generation error:', error);
      setGenerationError(
        error instanceof Error 
          ? error.message 
          : 'An error occurred during video generation.'
      );
      
      // slotStates를 다시 'empty'로 되돌리기
      setSlotStates(prev => {
        const newStates = [...prev];
        newStates[availableSlot] = 'empty';
        return newStates;
      });
      
      // generatingSlots에서 제거 + 남은 작업 없으면 isGenerating 해제
      setGeneratingSlots(prev => {
        const newSet = new Set(prev);
        newSet.delete(availableSlot);
        if (newSet.size === 0) {
          setIsGenerating(false);
        }
        return newSet;
      });
      
      setGeneratingProgress(new Map());
      setGeneratingJobIds(new Map());

      // 완료 시점 초기화
      setSlotCompletedAt(prev => {
        const newTimes = [...prev];
        newTimes[availableSlot] = null;
        return newTimes;
      });
    }
  };

  // 슬롯 선택 핸들러
  const handleSlotSelect = (index: number, video: GeneratedVideo | null) => {
    setSelectedSlotIndex(index);
    setActiveVideo(video);
  };

  // 다운로드 핸들러
  const handleDownload = async () => {
    if (!activeVideo || !activeVideo.url) return;
    
    if (isDownloading) return;
    
    // 파일명 생성: voguedrop_날짜_효과명.mp4
    const date = new Date(activeVideo.createdAt).toISOString().split('T')[0];
    const effectName = selectedEffects[0]?.name.toLowerCase().replace(/\s+/g, '-') || 'video';
    const filename = `voguedrop_${date}_${effectName}.mp4`;
    
    setIsDownloading(true);
    
    try {
      const response = await fetch(activeVideo.url);
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
    } catch (error) {
      console.error('Download failed:', error);
      setGenerationError('다운로드에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsDownloading(false);
    }
  };

  // 즐겨찾기 토글 핸들러
  const handleToggleFavorite = async (videoId: string) => {
    const isFavorite = favoriteVideos.has(videoId);
    const newFavoriteState = !isFavorite;
    
    // 낙관적 업데이트
    setFavoriteVideos(prev => {
      const newSet = new Set(prev);
      if (newFavoriteState) {
        newSet.add(videoId);
      } else {
        newSet.delete(videoId);
      }
      return newSet;
    });

    // slotContents 업데이트
    setSlotContents(prev => prev.map(slot => {
      if (slot?.type === 'video' && (slot.data as GeneratedVideo).id === videoId) {
        return {
          ...slot,
          data: { ...slot.data as GeneratedVideo, isFavorite: newFavoriteState }
        };
      }
      return slot;
    }));
    
    try {
      const response = await fetch('/api/canvas/favorite', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: videoId,
          isFavorite: newFavoriteState
        })
      });
      
      if (!response.ok) {
        // 실패시 상태 롤백
        setFavoriteVideos(prev => {
          const newSet = new Set(prev);
          if (isFavorite) {
            newSet.add(videoId);
          } else {
            newSet.delete(videoId);
          }
          return newSet;
        });
        
        // slotContents 롤백
        setSlotContents(prev => prev.map(slot => {
          if (slot?.type === 'video' && (slot.data as GeneratedVideo).id === videoId) {
            return {
              ...slot,
              data: { ...slot.data as GeneratedVideo, isFavorite: isFavorite }
            };
          }
          return slot;
        }));
        
        console.error('Failed to toggle favorite');
      }
    } catch (error) {
      // 에러시 상태 롤백
      setFavoriteVideos(prev => {
        const newSet = new Set(prev);
        if (isFavorite) {
          newSet.add(videoId);
        } else {
          newSet.delete(videoId);
        }
        return newSet;
      });
      
      // slotContents 롤백
      setSlotContents(prev => prev.map(slot => {
        if (slot?.type === 'video' && (slot.data as GeneratedVideo).id === videoId) {
          return {
            ...slot,
            data: { ...slot.data as GeneratedVideo, isFavorite: isFavorite }
          };
        }
        return slot;
      }));
      
      console.error('Error toggling favorite:', error);
    }
  };

  return (
    <EffectsDataProvider>
      <div className="min-h-screen flex flex-col bg-background text-foreground">
        <Header 
          onLibraryClick={() => setIsLibraryOpen(true)}
          activePage="clip"
          onEditClick={() => setIsProjectTitleModalOpen(true)}
        />

        <div className="flex flex-1">
          <LeftPanel
            isPrompterOpen={isPrompterOpen}
            onPrompterToggle={() => setIsPrompterOpen(!isPrompterOpen)}
            promptText={promptText}
            onPromptChange={setPromptText}
            uploadedImage={currentGeneratingImage}
            onImageUpload={(imageUrl) => {
              // LeftPanel에 이미지 표시
              setCurrentGeneratingImage(imageUrl);

              let chosenIndex = -1;
              // 슬롯 채우기: 이전 상태(prev)를 기반으로 결정하여 동시 업로드 시에도 순차 채움 보장
              setSlotContents(prev => {
                let target = -1;
                // 1) 빈 슬롯 우선
                for (let i = 0; i < 4; i++) {
                  if (!prev[i]) {
                    target = i;
                    break;
                  }
                }
                // 2) 이미지 슬롯 교체 (진행 중 제외: generatingProgress 기준)
                if (target === -1) {
                  for (let i = 0; i < 4; i++) {
                    const isGeneratingSlot = generatingProgress.has(i.toString());
                    if (prev[i]?.type === 'image' && !isGeneratingSlot) {
                      target = i;
                      break;
                    }
                  }
                }
                // 3) 비디오 슬롯 중 가장 오래된 완료를 교체 (slotCompletedAt 기준)
                if (target === -1) {
                  const videoIndices: number[] = []
                  for (let i = 0; i < 4; i++) {
                    if (prev[i]?.type === 'video') videoIndices.push(i)
                  }
                  if (videoIndices.length > 0) {
                    let idxChosen = videoIndices[0]
                    let timeChosen = slotCompletedAt[idxChosen]
                    for (let i = 1; i < videoIndices.length; i++) {
                      const idx = videoIndices[i]
                      const t = slotCompletedAt[idx]
                      if (t !== null && (timeChosen === null || t < timeChosen)) {
                        idxChosen = idx
                        timeChosen = t
                      }
                    }
                    target = idxChosen
                  }
                }
                chosenIndex = target;
                const newSlots = [...prev];
                if (target !== -1) {
                  newSlots[target] = { type: 'image', data: imageUrl };
                }
                return newSlots;
              });

              if (chosenIndex !== -1) {
                // 이미지 슬롯은 'empty' 상태 유지 (generate 가능)
                setSlotStates(prev => {
                  const newStates = [...prev];
                  newStates[chosenIndex] = 'empty';
                  return newStates;
                });
                // 이미지가 들어오면 완료 시점 리셋
                setSlotCompletedAt(prev => {
                  const newTimes = [...prev]
                  newTimes[chosenIndex] = null
                  return newTimes
                })
              }
            }}
            onImageRemove={() => {
              // LeftPanel의 이미지 제거
              const prevImageUrl = currentGeneratingImage;
              setCurrentGeneratingImage(null);
              
              // LeftPanel에 보이던 같은 이미지를 가진 슬롯만 제거
              if (prevImageUrl) {
                setSlotContents(prev => {
                  const newSlots = [...prev];
                  for (let i = 0; i < 4; i++) {
                    if (
                      newSlots[i]?.type === 'image' &&
                      (newSlots[i]?.data as string) === prevImageUrl &&
                      slotStates[i] === 'empty'
                    ) {
                      newSlots[i] = null;
                      // 해당 슬롯 상태도 empty로 유지
                      setSlotStates(prevStates => {
                        const newStates = [...prevStates];
                        newStates[i] = 'empty';
                        return newStates;
                      });
                      // 완료 시점 초기화
                      setSlotCompletedAt(prevTimes => {
                        const newTimes = [...prevTimes]
                        newTimes[i] = null
                        return newTimes
                      })
                      break;
                    }
                  }
                  return newSlots;
                });
              }
            }}
            generationError={generationError}
            onEffectModalOpen={() => setIsEffectModalOpen(true)}
            selectedEffects={selectedEffects}
            onEffectRemove={handleEffectRemove}
          />

          <Canvas
            selectedResolution={selectedResolution}
            selectedSize={selectedSize}
            onPromptModalOpen={() => setIsPromptModalOpen(true)}
            showControls={true}
            slotContents={slotContents}
            slotStates={slotStates}
            onVideoSelect={handleVideoSelect}
            onGenerateClick={handleGenerateVideo}
            isGenerating={isGenerating}
            canGenerate={canGenerate}
            selectedDuration={selectedDuration}
            onDurationChange={setSelectedDuration}
            generatingProgress={generatingProgress}
            generatingJobIds={generatingJobIds}
            onRemoveContent={handleRemoveContent}
            onSlotSelect={handleSlotSelect}
            selectedSlotIndex={selectedSlotIndex}
            activeVideo={activeVideo}
            onDownloadClick={handleDownload}
            isDownloading={isDownloading}
            favoriteVideos={favoriteVideos}
            onToggleFavorite={handleToggleFavorite}
          />
        </div>

        <LibraryModal 
          isOpen={isLibraryOpen} 
          onClose={() => setIsLibraryOpen(false)} 
          favoriteVideos={favoriteVideos}
          onToggleFavorite={handleToggleFavorite}
        />
        
        <EffectModal 
          isOpen={isEffectModalOpen} 
          onClose={() => setIsEffectModalOpen(false)} 
          onSelectEffect={handleEffectSelect}
          selectedEffects={selectedEffects}
        />
        
        <PromptModal
          isOpen={isPromptModalOpen}
          onClose={() => setIsPromptModalOpen(false)}
          promptText={promptText}
          negativePrompt={negativePrompt}
          onPromptChange={setPromptText}
          onNegativePromptChange={setNegativePrompt}
          onApply={() => {}}
        />
        
        <CameraModal
          isOpen={isCameraModalOpen}
          onClose={() => setIsCameraModalOpen(false)}
          onCapture={() => {}}
        />
        
        <ModelModal
          isOpen={isModelModalOpen}
          onClose={() => setIsModelModalOpen(false)}
          onSelectModel={setSelectedModelId}
          selectedModelId={selectedModelId}
        />

        <ProjectTitleModal
          isOpen={isProjectTitleModalOpen}
          onClose={() => setIsProjectTitleModalOpen(false)}
          onConfirm={(title) => {
            router.push(`/video-editor?title=${encodeURIComponent(title)}`)
          }}
        />
      </div>
    </EffectsDataProvider>
  )
}