'use client';

import React, { createContext, useContext, ReactNode, useState } from 'react';
import { useVideoGeneration } from '../_hooks/useVideoGeneration';
import { useSlot } from './SlotContext';
import { useSettings } from './SettingsContext';
import { useEffects } from './EffectsContext';
import type { VideoGenerationReturn } from '../_types';
import type { GeneratedVideo } from '@/shared/types/canvas';

/**
 * GenerationContext - Canvas AI 비디오 생성 작업 관리
 * 
 * @description
 * Canvas에서 AI 비디오 생성 작업의 전체 생명주기를 관리합니다.
 * 비동기 생성 요청부터 완료까지의 상태 추적, 진행률 표시, 결과 처리를 담당합니다.
 * 
 * @manages
 * - currentGeneratingImage: 현재 생성 작업 중인 이미지 URL
 * - currentEditingSlotIndex: 현재 편집/생성 대상 슬롯 인덱스
 * - generatingJobs: 진행 중인 생성 작업 목록
 * - generationProgress: 각 작업의 진행률 (polling 기반)
 * - generationResults: 완료된 생성 결과
 * 
 * @features
 * - 비동기 AI 비디오 생성 시작
 * - 실시간 진행률 추적 (3초 간격 polling)
 * - 생성 완료 시 슬롯 자동 업데이트
 * - 생성 실패 시 에러 처리 및 재시도
 * - 여러 모델 동시 생성 지원
 * - Mock 모드 지원 (개발/테스트용)
 * 
 * @workflow
 * 1. 이미지 + 효과 선택
 * 2. generateVideo() 호출
 * 3. Job ID 생성 및 fal.ai API 요청
 * 4. 3초 간격 polling으로 진행률 추적
 * 5. Webhook 또는 polling으로 완료 감지
 * 6. 결과를 슬롯에 자동 저장
 * 
 * @integration
 * - SlotContext: 생성 결과를 활성 슬롯에 저장
 * - SettingsContext: 생성 설정 (해상도, 모델 등) 참조
 * - EffectsContext: 선택된 효과를 프롬프트로 변환
 */
interface GenerationContextValue {
  /** 비디오 생성 관리 객체와 제어 함수들 */
  videoGeneration: VideoGenerationReturn;
  /** 현재 생성 중인 이미지 URL */
  currentGeneratingImage: string | null;
  /** 현재 생성 이미지 설정 함수 */
  setCurrentGeneratingImage: (imageUrl: string | null) => void;
  /** 현재 편집 중인 슬롯 인덱스 */
  currentEditingSlotIndex: number | null;
  /** 편집 슬롯 인덱스 설정 함수 */
  setCurrentEditingSlotIndex: (index: number | null) => void;
  /** 선택된 비디오 ID */
  selectedVideoId: string | null;
  /** 선택된 비디오 ID 설정 함수 */
  setSelectedVideoId: (videoId: string | null) => void;
  /** 다운로드 진행 중 여부 */
  isDownloading: boolean;
  /** 비디오 다운로드 처리 함수 */
  handleDownload: () => Promise<void>;
}

const GenerationContext = createContext<GenerationContextValue | undefined>(undefined);

/**
 * Canvas 비디오 생성 상태를 사용하는 훅
 * @returns {GenerationContextValue} 비디오 생성 관리 객체와 제어 함수들
 * @throws {Error} GenerationProvider 없이 사용할 경우 에러 발생
 * 
 * @example
 * ```tsx
 * function GenerateButton() {
 *   const { videoGeneration, currentGeneratingImage } = useGeneration();
 *   
 *   const handleGenerate = async () => {
 *     if (videoGeneration.canGenerate) {
 *       await videoGeneration.generateVideo();
 *     }
 *   };
 *   
 *   return (
 *     <button 
 *       onClick={handleGenerate}
 *       disabled={!videoGeneration.canGenerate || videoGeneration.isGenerating}
 *     >
 *       {videoGeneration.isGenerating ? '생성 중...' : '영상 생성'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useGeneration(): GenerationContextValue {
  const context = useContext(GenerationContext);
  if (!context) {
    throw new Error('useGeneration must be used within GenerationProvider');
  }
  return context;
}

/**
 * GenerationProvider 컴포넌트의 Props
 * @interface GenerationProviderProps
 */
interface GenerationProviderProps {
  /** 하위 컴포넌트들 */
  children: ReactNode;
}

/**
 * 비디오 생성 관리를 담당하는 Context Provider
 * 
 * 관리하는 상태:
 * - 생성 중 여부: AI 비디오 생성이 진행 중인지 상태
 * - 생성 가능 여부: 현재 조건에서 생성을 시작할 수 있는지 여부
 * - 진행률: 각 job별 생성 진행률 (Map<jobId, progress>)
 * - Job ID 추적: 현재 활성화된 생성 작업들의 ID 맵핑
 * - 에러 상태: 생성 실패 시 에러 메시지
 * - 현재 생성 이미지: 생성 중인 기준 이미지 URL
 * - 편집 중인 슬롯: 현재 편집/수정 중인 슬롯 인덱스
 * - 선택된 비디오: 다운로드나 기타 작업 대상 비디오 ID
 * - 다운로드 상태: 비디오 다운로드 진행 중 여부
 * 
 * 제공하는 기능:
 * - 비디오 생성 시작: 설정과 효과를 적용하여 AI 생성 요청
 * - 생성 상태 추적: 실시간 진행률 모니터링 및 polling
 * - 슬롯별 생성 여부 확인: 특정 슬롯의 생성 중 상태 체크
 * - 에러 처리: 생성 실패 시 에러 상태 관리
 * - 비디오 다운로드: 생성된 비디오 파일 다운로드
 * 
 * 다른 Context와의 연계:
 * - SlotContext: 생성된 비디오를 슬롯에 배치
 * - SettingsContext: 생성 설정 (프롬프트, 해상도 등) 참조
 * - EffectsContext: 선택된 효과들을 생성 요청에 포함
 * 
 * @param {GenerationProviderProps} props - Provider 속성
 * @returns {React.ReactElement} Context Provider 컴포넌트
 * 
 * @example
 * ```tsx
 * function CanvasPage() {
 *   return (
 *     <GenerationProvider>
 *       <CanvasControls />
 *       <ProgressIndicator />
 *       <DownloadButton />
 *     </GenerationProvider>
 *   );
 * }
 * ```
 */
export function GenerationProvider({ children }: GenerationProviderProps) {
  // 의존성 Context들
  const { slotManager } = useSlot();
  const { settings } = useSettings();
  const { effects } = useEffects();

  // 로컬 상태
  const [currentGeneratingImage, setCurrentGeneratingImage] = useState<string | null>(null);
  const [currentEditingSlotIndex, setCurrentEditingSlotIndex] = useState<number | null>(null);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  // 비디오 생성 훅 (의존성 주입)
  const videoGeneration = useVideoGeneration({
    getCurrentImage: () => currentGeneratingImage,
    selectedEffects: effects.selectedEffects,
    promptText: settings.promptText,
    selectedDuration: settings.selectedDuration,
    slotManager: {
      slotStates: slotManager.slotStates,
      findAvailableSlotForGeneration: slotManager.findAvailableSlotForGeneration,
      setSlotToImage: slotManager.setSlotToImage,
      markSlotGenerating: slotManager.markSlotGenerating,
      placeVideoInSlot: slotManager.placeVideoInSlot,
      resetSlot: slotManager.resetSlot,
      getSlotContents: () => slotManager.slotContents,
    },
    onVideoCompleted: (video: GeneratedVideo) => {
      if (!selectedVideoId) {
        setSelectedVideoId(video.id);
      }
    },
  });

  // 다운로드 핸들러
  const handleDownload = async (): Promise<void> => {
    if (!slotManager.activeVideo || !slotManager.activeVideo.url) {
      return;
    }

    if (isDownloading) {
      return;
    }

    setIsDownloading(true);

    try {
      const { CanvasAPI } = await import('../_services/api');
      const effectName = effects.selectedEffects[0]?.name;
      await CanvasAPI.downloadAndSaveVideo(slotManager.activeVideo, effectName);
    } catch (error) {
      console.error('Download failed:', error);
      videoGeneration.setGenerationError('다운로드에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsDownloading(false);
    }
  };

  const contextValue: GenerationContextValue = {
    videoGeneration,
    currentGeneratingImage,
    setCurrentGeneratingImage,
    currentEditingSlotIndex,
    setCurrentEditingSlotIndex,
    selectedVideoId,
    setSelectedVideoId,
    isDownloading,
    handleDownload,
  };

  return (
    <GenerationContext.Provider value={contextValue}>
      {children}
    </GenerationContext.Provider>
  );
}