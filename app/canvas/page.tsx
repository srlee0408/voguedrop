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
  const [selectedHistoryVideos, setSelectedHistoryVideos] = useState<GeneratedVideo[]>([])
  const [selectedDuration, setSelectedDuration] = useState<string>("6")
  const [generatingProgress, setGeneratingProgress] = useState<Map<string, number>>(new Map())
  const [generatingJobIds, setGeneratingJobIds] = useState<Map<string, string>>(new Map())
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null)
  const [activeVideo, setActiveVideo] = useState<GeneratedVideo | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [favoriteVideos, setFavoriteVideos] = useState<Set<string>>(new Set())
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
    setSelectedVideoId(video.id);
    
    // 이미 선택된 비디오인지 확인
    const isAlreadySelected = selectedHistoryVideos.some(v => v.id === video.id);
    
    if (isAlreadySelected) {
      // 이미 선택된 경우 제거
      setSelectedHistoryVideos(prev => prev.filter(v => v.id !== video.id));
    } else {
      // 새로 선택하는 경우
      setSlotContents(prev => {
        // 첫 번째 슬롯이 이미지인 경우 두 번째 슬롯부터 추가
        if (prev[0]?.type === 'image') {
          const newSlots = [...prev];
          // 두 번째 슬롯부터 비디오 추가 (FIFO 방식)
          const videosToAdd = [{ type: 'video' as const, data: video }];
          const existingVideos = prev.slice(1).filter(slot => slot?.type === 'video');
          const allVideos = [...videosToAdd, ...existingVideos.slice(0, 2)]; // 최대 3개까지
          
          // 첫 번째는 이미지 유지, 나머지는 비디오로 채우기
          newSlots[0] = prev[0]; // 이미지 유지
          allVideos.forEach((v, i) => {
            if (i < 3) newSlots[i + 1] = v;
          });
          
          // 남은 슬롯은 null로 채우기
          for (let i = allVideos.length + 1; i < 4; i++) {
            newSlots[i] = null;
          }
          
          return newSlots;
        } else {
          // 첫 번째 슬롯이 이미지가 아닌 경우 기존 FIFO 방식
          const newSlots = [
            { type: 'video' as const, data: video },
            ...prev.slice(0, 3).filter(Boolean)
          ];
          while (newSlots.length < 4) {
            newSlots.push(null);
          }
          return newSlots;
        }
      });
      setSelectedHistoryVideos(prev => [...prev, video]);
    }
  };

  // Generate 버튼 활성화 조건 계산
  const canGenerate = !!currentGeneratingImage && (selectedEffects.length > 0 || promptText.trim().length > 0);

  // 콘텐츠 제거 핸들러
  const handleRemoveContent = (index: number, type: 'image' | 'video') => {
    setSlotContents(prev => {
      const newSlots = [...prev];
      newSlots[index] = null;
      
      // 빈 슬롯을 제거하고 다시 정렬 (FIFO 유지)
      const nonNullSlots = newSlots.filter(slot => slot !== null);
      const result: Array<{type: 'image' | 'video', data: string | GeneratedVideo} | null> = [...nonNullSlots];
      
      // null로 채우기
      while (result.length < 4) {
        result.push(null);
      }
      
      return result;
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

    setIsGenerating(true);
    setGenerationError(null);

    // 즉시 진행률 맵 초기화 - Generate 버튼 클릭 즉시 로딩 표시
    const initialProgressMap = new Map<string, number>();
    const initialJobIdsMap = new Map<string, string>();
    
    // 효과 개수만큼 슬롯을 0%로 초기화
    selectedEffects.forEach((_, index) => {
      initialProgressMap.set(index.toString(), 0);
      initialJobIdsMap.set(index.toString(), `pending-${index}`);
    });
    
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
      
      data.jobs.forEach((job: { jobId: string }, index: number) => {
        progressMap.set(index.toString(), 0);
        jobIdsMap.set(index.toString(), job.jobId);
        jobStartTimes.set(job.jobId, Date.now());
        jobCompletedMap.set(job.jobId, false);
      });
      setGeneratingProgress(progressMap);
      setGeneratingJobIds(jobIdsMap);

      // 2. 폴링 시작
      const pollJobs = async () => {
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
                  const currentProgress = prev.get(originalIndex.toString()) || 0;
                  // 이전 값보다 큰 경우에만 업데이트 (단조 증가 보장)
                  const newProgress = Math.max(currentProgress, targetProgress);
                  newMap.set(originalIndex.toString(), Math.floor(newProgress));
                  return newMap;
                });
              }
            } else if (statusData.status === 'completed') {
              // 완료 시 동적 애니메이션 시작
              if (!jobCompletedMap.get(job.jobId)) {
                jobCompletedMap.set(job.jobId, true);
                completionStartTimes.set(job.jobId, Date.now());
                
                // 현재 진행률 가져오기
                const currentProgressValue = generatingProgress.get(originalIndex.toString()) || 0;
                
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
                    newMap.set(originalIndex.toString(), Math.floor(targetProgress));
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

          // 첫 번째 슬롯의 이미지를 비디오로 교체
          if (newVideos.length > 0 && slotContents[0]?.type === 'image') {
            setSlotContents(prev => {
              const newSlots = [...prev];
              newSlots[0] = { type: 'video', data: newVideos[0] };
              return newSlots;
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
          setTimeout(pollJobs, 3000); // 3초 후 다시 확인
        } else {
          // 모든 작업 완료
          setIsGenerating(false);
          
          // 진행률 초기화
          setGeneratingProgress(new Map());
          setGeneratingJobIds(new Map());
          
          const failedJobs = jobStatuses.filter(job => job.status === 'failed');
          if (failedJobs.length === jobStatuses.length) {
            setGenerationError('All video generation attempts failed.');
          }
        }
      };

      // 폴링 시작
      setTimeout(pollJobs, 3000);
      
    } catch (error) {
      console.error('Video generation error:', error);
      setGenerationError(
        error instanceof Error 
          ? error.message 
          : 'An error occurred during video generation.'
      );
      setIsGenerating(false);
      setGeneratingProgress(new Map());
      setGeneratingJobIds(new Map());
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
            onImageUpload={(imageUrl) => {
              setSlotContents(prev => {
                // 첫 번째 슬롯이 이미지인 경우 교체만 함
                if (prev[0]?.type === 'image') {
                  const newSlots = [...prev];
                  newSlots[0] = { type: 'image' as const, data: imageUrl };
                  return newSlots;
                } 
                // 첫 번째 슬롯이 비어있거나 영상인 경우 FIFO 방식 적용
                else {
                  const newSlots = [
                    { type: 'image' as const, data: imageUrl },
                    ...prev.slice(0, 3).filter(Boolean) // 마지막 슬롯 제거
                  ];
                  // null로 채우기
                  while (newSlots.length < 4) {
                    newSlots.push(null);
                  }
                  return newSlots;
                }
              });
              setCurrentGeneratingImage(imageUrl);
            }}
            isGenerating={isGenerating}
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