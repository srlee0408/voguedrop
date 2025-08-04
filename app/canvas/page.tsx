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
import type { GeneratedVideo } from "@/types/canvas"
import type { EffectTemplateWithMedia } from "@/types/database"
import { useBeforeUnload } from "./_hooks/useBeforeUnload"
import { EffectsDataProvider } from "./_hooks/useEffectsData"

export default function CanvasPage() {
  const [isLibraryOpen, setIsLibraryOpen] = useState(false)
  const [isEffectModalOpen, setIsEffectModalOpen] = useState(false)
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false)
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false)
  const [isModelModalOpen, setIsModelModalOpen] = useState(false)
  const [isPrompterOpen, setIsPrompterOpen] = useState(false)
  const [promptText, setPromptText] = useState("")
  const [negativePrompt, setNegativePrompt] = useState("")
  const [selectedResolution] = useState("1:1")
  const [selectedSize] = useState("1024×1024")
  const [selectedModelId, setSelectedModelId] = useState<string>("")
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [generatedVideos, setGeneratedVideos] = useState<Map<string, GeneratedVideo>>(new Map())
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedEffects, setSelectedEffects] = useState<EffectTemplateWithMedia[]>([])
  const [generationError, setGenerationError] = useState<string | null>(null)
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null)
  const [selectedHistoryVideos, setSelectedHistoryVideos] = useState<GeneratedVideo[]>([])
  const [selectedDuration, setSelectedDuration] = useState<string>("6")
  const [generatingProgress, setGeneratingProgress] = useState<Map<string, number>>(new Map())
  const [currentWebhookStatus, setCurrentWebhookStatus] = useState<string>("")
  const [currentElapsedMinutes, setCurrentElapsedMinutes] = useState<number>(0)
  const [currentElapsedSeconds, setCurrentElapsedSeconds] = useState<number>(0)
  
  // 페이지 이탈 방지
  useBeforeUnload(isGenerating, 'Video generation is in progress. Leaving the page will cancel the generation.')
  
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
      // 새로 선택하는 경우 맨 끝에 추가
      setSelectedHistoryVideos(prev => {
        // 업로드 이미지가 있으면 3개, 없으면 4개까지
        const maxVideos = uploadedImage ? 3 : 4;
        if (prev.length >= maxVideos) {
          // 가장 오래된 선택 제거하고 새로운 것 추가
          return [...prev.slice(1), video];
        }
        return [...prev, video];
      });
    }
  };

  // Generate 버튼 활성화 조건 계산
  const canGenerate = !!uploadedImage && selectedEffects.length > 0;

  // 콘텐츠 제거 핸들러
  const handleRemoveContent = (index: number, type: 'image' | 'video') => {
    if (type === 'image' && index === 0 && uploadedImage) {
      // 업로드된 이미지 제거
      setUploadedImage(null);
    } else if (type === 'video') {
      // 선택된 히스토리 비디오 제거
      const videoIndex = uploadedImage ? index - 1 : index;
      if (videoIndex >= 0 && videoIndex < selectedHistoryVideos.length) {
        const videoToRemove = selectedHistoryVideos[videoIndex];
        setSelectedHistoryVideos(prev => prev.filter(v => v.id !== videoToRemove.id));
      }
    }
  };

  const handleGenerateVideo = async () => {
    if (!uploadedImage) {
      setGenerationError('Please upload an image first.');
      return;
    }

    if (selectedEffects.length === 0) {
      setGenerationError('Please select at least one effect.');
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);

    try {
      // 1. 비동기 작업 시작
      const response = await fetch('/api/canvas/generate-async', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: uploadedImage,
          selectedEffects,
          basePrompt: promptText,
          duration: selectedDuration,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Video generation failed.');
      }

      // 진행률 초기화 - 각 작업을 슬롯 인덱스와 매핑
      const progressMap = new Map<string, number>();
      const jobStartTimes = new Map<string, number>(); // 작업 시작 시간 기록
      
      data.jobs.forEach((job: { jobId: string }, index: number) => {
        progressMap.set(index.toString(), 0);
        jobStartTimes.set(job.jobId, Date.now());
      });
      setGeneratingProgress(progressMap);

      // 2. 폴링 시작
      const pollJobs = async () => {
        const pollPromises = data.jobs
          .map(async (job: { jobId: string }, originalIndex: number) => {
            const jobStartTime = jobStartTimes.get(job.jobId) || Date.now();
            const elapsedTime = Date.now() - jobStartTime;
            const elapsedMinutes = Math.floor(elapsedTime / 60000);
            const elapsedSeconds = Math.floor(elapsedTime / 1000);
            
            // UI 상태 업데이트
            setCurrentElapsedMinutes(elapsedMinutes);
            setCurrentElapsedSeconds(elapsedSeconds);
            
            // 5분 경과 체크
            if (elapsedMinutes >= 5 && elapsedTime % 60000 < 2000) { // 매 분마다 한 번만 체크
              console.log(`Job ${job.jobId}: ${elapsedMinutes}분 경과, webhook 상태 확인`);
              
              // webhook 상태 확인
              const webhookCheckResponse = await fetch(`/api/canvas/jobs/${job.jobId}/check-webhook`);
              const webhookCheckData = await webhookCheckResponse.json();
              
              // webhook 상태 UI 업데이트
              setCurrentWebhookStatus(webhookCheckData.webhookStatus || 'pending');
              
              if (webhookCheckData.webhookCheckRequired) {
                console.log(`Job ${job.jobId}: webhook 미수신으로 fal.ai 직접 확인 필요`);
                
                // poll 엔드포인트로 fal.ai 상태 직접 확인
                const pollResponse = await fetch(`/api/canvas/jobs/${job.jobId}/poll`);
                const pollData = await pollResponse.json();
                
                // webhook 상태 업데이트
                if (pollData.webhookStatus) {
                  setCurrentWebhookStatus(pollData.webhookStatus);
                }
                
                if (pollData.status === 'completed' || pollData.status === 'failed') {
                  return { ...pollData, originalIndex };
                }
              }
            }
            
            // 일반 상태 확인
            const statusResponse = await fetch(`/api/canvas/jobs/${job.jobId}`);
            const statusData = await statusResponse.json();
            
            // 진행률 업데이트 (시뮬레이션 - 실제로는 API에서 progress 정보가 와야 함)
            if (statusData.status === 'processing') {
              // 진행률 시뮬레이션: 200-250초 기준으로 단계별 진행률 계산
              const currentTime = Date.now();
              const startTime = jobStartTimes.get(job.jobId) || currentTime;
              const elapsedSeconds = (currentTime - startTime) / 1000;
              
              let targetProgress = 0;
              
              // 단계별 진행률 계산 (총 225초 기준)
              if (elapsedSeconds < 40) {
                // 0-40초: 초기 처리 (0-20%)
                targetProgress = (elapsedSeconds / 40) * 20;
              } else if (elapsedSeconds < 80) {
                // 40-80초: 이미지 분석 (20-40%)
                targetProgress = 20 + ((elapsedSeconds - 40) / 40) * 20;
              } else if (elapsedSeconds < 200) {
                // 80-200초: AI 영상 생성 (40-80%) - 가장 오래 걸리는 구간
                targetProgress = 40 + ((elapsedSeconds - 80) / 120) * 40;
              } else if (elapsedSeconds < 240) {
                // 200-240초: 후처리 및 인코딩 (80-95%)
                targetProgress = 80 + ((elapsedSeconds - 200) / 40) * 15;
              } else {
                // 240초 이상: 최종 완료 단계 (95-99%)
                targetProgress = Math.min(95 + ((elapsedSeconds - 240) / 10) * 4, 99);
              }
              
              // 약간의 랜덤성 추가 (±2%)
              const randomOffset = (Math.random() - 0.5) * 4;
              targetProgress = Math.max(0, Math.min(99, targetProgress + randomOffset));
              
              setGeneratingProgress(prev => {
                const newMap = new Map(prev);
                newMap.set(originalIndex.toString(), Math.floor(targetProgress));
                return newMap;
              });
            } else if (statusData.status === 'completed') {
              // 완료 시 100%로 설정
              setGeneratingProgress(prev => {
                const newMap = new Map(prev);
                newMap.set(originalIndex.toString(), 100);
                return newMap;
              });
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

          setGeneratedVideos(prev => {
            // 중복 제거하고 추가
            const existingIds = new Set(Array.from(prev.values()).map(v => v.id));
            const uniqueNewVideos = newVideos.filter(v => !existingIds.has(v.id));
            const newMap = new Map(prev);
            uniqueNewVideos.forEach(video => {
              newMap.set(video.id.toString(), video);
            });
            return newMap;
          });

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
          
          // 진행률 및 webhook 상태 초기화
          setGeneratingProgress(new Map());
          setCurrentWebhookStatus("");
          setCurrentElapsedMinutes(0);
          setCurrentElapsedSeconds(0);
          
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
      setCurrentWebhookStatus("");
      setCurrentElapsedMinutes(0);
    }
  };




  return (
    <EffectsDataProvider>
      <div className="min-h-screen flex flex-col bg-background text-foreground">
        <Header onLibraryClick={() => setIsLibraryOpen(true)} />

        <div className="flex flex-1">
          <LeftPanel
            isPrompterOpen={isPrompterOpen}
            onPrompterToggle={() => setIsPrompterOpen(!isPrompterOpen)}
            promptText={promptText}
            onPromptChange={setPromptText}
            onImageUpload={setUploadedImage}
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
            generatedVideos={Array.from(generatedVideos.values())}
            onVideoSelect={handleVideoSelect}
            onGenerateClick={handleGenerateVideo}
            isGenerating={isGenerating}
            canGenerate={canGenerate}
            selectedDuration={selectedDuration}
            onDurationChange={setSelectedDuration}
            generatingProgress={generatingProgress}
            webhookStatus={currentWebhookStatus}
            elapsedMinutes={currentElapsedMinutes}
            elapsedSeconds={currentElapsedSeconds}
            selectedHistoryVideos={selectedHistoryVideos}
            uploadedImage={uploadedImage}
            onRemoveContent={handleRemoveContent}
          />
        </div>

        <LibraryModal isOpen={isLibraryOpen} onClose={() => setIsLibraryOpen(false)} />
        
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
          onApply={() => console.log("Generating with prompt:", promptText)}
        />
        
        <CameraModal
          isOpen={isCameraModalOpen}
          onClose={() => setIsCameraModalOpen(false)}
          onCapture={(imageData) => console.log("Captured image:", imageData)}
        />
        
        <ModelModal
          isOpen={isModelModalOpen}
          onClose={() => setIsModelModalOpen(false)}
          onSelectModel={setSelectedModelId}
          selectedModelId={selectedModelId}
        />
      </div>
    </EffectsDataProvider>
  )
}