'use client';

import { ReactNode, useEffect } from 'react';
import { SlotProvider } from './SlotContext';
import { SettingsProvider } from './SettingsContext';
import { ModalProvider } from './ModalContext';
import { FavoritesProvider } from './FavoritesContext';
import { EffectsProvider } from './EffectsContext';
import { GenerationProvider } from './GenerationContext';
import { useCanvasPersistence } from '@/features/canvas-generation/_hooks/useCanvasPersistence';
import { useSlot } from './SlotContext';
import { useSettings } from './SettingsContext';
import { useModals } from './ModalContext';
import { useFavorites } from './FavoritesContext';
import { useEffects } from './EffectsContext';
import { useGeneration } from './GenerationContext';
import { getCanvasStateSync } from '@/shared/lib/canvas-storage';

/**
 * CanvasProviders 컴포넌트의 Props
 * @interface CanvasProvidersProps
 */
interface CanvasProvidersProps {
  /** 하위 컴포넌트들 */
  children: ReactNode;
}

/**
 * Canvas 상태를 복원하고 persistence를 설정하는 Connector 컴포넌트
 * 
 * 기능:
 * - localStorage에서 저장된 Canvas 상태 복원
 * - 효과, 설정, 슬롯 상태를 각각의 Context에 복원
 * - 생성 중 상태는 empty로 리셋하여 페이지 새로고침 시 일관성 유지
 * - 현재 생성 중인 이미지 상태 복원
 * 
 * @param {Object} props - 컴포넌트 속성
 * @param {ReactNode} props.children - 하위 컴포넌트들
 * @returns {ReactNode} 하위 컴포넌트들을 그대로 렌더링
 */
function PersistenceConnector({ children }: { children: ReactNode }) {
  const { slotManager } = useSlot();
  const { settings } = useSettings();
  const { effects } = useEffects();
  const { currentGeneratingImage, setCurrentGeneratingImage } = useGeneration();

  // 클라이언트 사이드에서만 localStorage 복원
  useEffect(() => {
    const savedState = getCanvasStateSync();
    if (savedState) {
      // 효과 복원
      if (savedState.selectedEffects?.length > 0) {
        effects.restoreEffects(savedState.selectedEffects);
      }
      
      // 설정 복원
      settings.updateSettings({
        promptText: savedState.promptText,
        negativePrompt: savedState.negativePrompt,
        selectedResolution: savedState.selectedResolution,
        selectedSize: savedState.selectedSize,
        selectedDuration: savedState.selectedDuration,
      });
      
      // 슬롯 상태 복원 (generating 상태는 empty로 리셋)
      const resetSlotStates = savedState.slotStates.map(state => 
        state === 'generating' ? 'empty' as const : state
      );
      slotManager.restoreSlotStates({
        slotContents: savedState.slotContents,
        slotStates: resetSlotStates,
        slotCompletedAt: savedState.slotCompletedAt,
      });
      
      // 업로드된 이미지 복원
      if (savedState.uploadedImage) {
        setCurrentGeneratingImage(savedState.uploadedImage);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Canvas persistence 훅 사용 (상태 변경 시 자동 저장)
  useCanvasPersistence({
    uploadedImage: currentGeneratingImage,
    selectedEffects: effects.selectedEffects,
    promptText: settings.promptText,
    negativePrompt: settings.negativePrompt,
    selectedResolution: settings.selectedResolution,
    selectedSize: settings.selectedSize,
    selectedDuration: settings.selectedDuration,
    slotContents: slotManager.slotContents,
    slotStates: slotManager.slotStates,
    slotCompletedAt: slotManager.slotCompletedAt,
  });

  return <>{children}</>;
}

/**
 * 모든 Canvas Context를 통합하는 Provider
 * 
 * Canvas 페이지의 모든 상태를 관리하는 최상위 Provider 컴포넌트입니다.
 * Video Editor의 Providers 패턴을 참고하여 기능별로 Context를 분리했습니다.
 * 
 * Provider 계층 구조:
 * 1. ModalProvider - 모달 상태 관리 (독립적)
 * 2. FavoritesProvider - 즐겨찾기 관리 (독립적)
 * 3. SlotProvider - 4슬롯 콘텐츠 관리 (독립적)
 * 4. SettingsProvider - AI 생성 설정 관리 (독립적)
 * 5. EffectsProvider - 효과 선택 관리 (독립적)
 * 6. GenerationProvider - 비디오 생성 관리 (의존: Slot, Settings, Effects)
 * 7. PersistenceConnector - localStorage 상태 복원/저장 (의존: 모든 Context)
 * 
 * 특징:
 * - 관심사 분리: 각 Context가 명확한 단일 책임을 가짐
 * - 성능 최적화: 필요한 상태만 구독하여 불필요한 리렌더링 방지
 * - 확장성: 새로운 기능 추가 시 기존 Context에 영향 없음
 * - 상태 복원: 페이지 새로고침 후에도 사용자 작업 상태 유지
 * 
 * @param {CanvasProvidersProps} props - Provider 속성
 * @returns {React.ReactElement} Context Provider 트리
 * 
 * @example
 * ```tsx
 * function App() {
 *   return (
 *     <CanvasProviders>
 *       <CanvasPage />
 *     </CanvasProviders>
 *   );
 * }
 * ```
 */
export function CanvasProviders({ children }: CanvasProvidersProps) {
  return (
    <ModalProvider>
      <FavoritesProvider>
        <SlotProvider>
          <SettingsProvider>
            <EffectsProvider>
              <GenerationProvider>
                <PersistenceConnector>
                  {children}
                </PersistenceConnector>
              </GenerationProvider>
            </EffectsProvider>
          </SettingsProvider>
        </SlotProvider>
      </FavoritesProvider>
    </ModalProvider>
  );
}

// Context export for convenience
export { useSlot } from './SlotContext';
export { useSettings } from './SettingsContext';
export { useModals } from './ModalContext';
export { useFavorites } from './FavoritesContext';
export { useEffects } from './EffectsContext';
export { useGeneration } from './GenerationContext';

/**
 * 모든 Canvas Context를 한 번에 사용할 수 있는 통합 훅
 * 
 * 모든 Canvas 관련 상태와 함수에 접근할 수 있는 편의 훅입니다.
 * 개별 Context 훅을 사용하는 것보다 성능상 불리할 수 있으므로,
 * 정말 여러 Context가 필요한 경우에만 사용하세요.
 * 
 * @returns {Object} 모든 Canvas Context의 값들을 포함하는 객체
 * @throws {Error} 각 Provider 없이 사용할 경우 에러 발생
 * 
 * @example
 * ```tsx
 * // 여러 Context가 필요한 경우
 * function CanvasControls() {
 *   const { settings, effects, videoGeneration, slotManager } = useCanvas();
 *   
 *   const handleGenerate = async () => {
 *     if (videoGeneration.canGenerate) {
 *       await videoGeneration.generateVideo();
 *     }
 *   };
 *   
 *   return (
 *     <button onClick={handleGenerate}>
 *       생성 ({effects.selectedEffects.length}/2 효과 선택됨)
 *     </button>
 *   );
 * }
 * 
 * // ❌ 하나의 Context만 필요한 경우 (개별 훅 사용 권장)
 * function PromptInput() {
 *   const { settings } = useCanvas(); // 비효율적
 *   const { settings } = useSettings(); // 권장
 * }
 * ```
 */
export function useCanvas() {
  const { slotManager } = useSlot();
  const { settings } = useSettings();
  const { modals } = useModals();
  const { favorites } = useFavorites();
  const { effects } = useEffects();
  const {
    videoGeneration,
    currentGeneratingImage,
    setCurrentGeneratingImage,
    currentEditingSlotIndex,
    setCurrentEditingSlotIndex,
    selectedVideoId,
    setSelectedVideoId,
    isDownloading,
    handleDownload,
  } = useGeneration();

  return {
    // 모달 관리
    modals,
    
    // 설정 관리
    settings,
    
    // 즐겨찾기 관리
    favorites,
    
    // 효과 관리
    effects,
    
    // 슬롯 관리
    slotManager,
    
    // 비디오 생성 관리
    videoGeneration,
    
    // 현재 생성 이미지
    currentGeneratingImage,
    setCurrentGeneratingImage,
    
    // 현재 편집 중인 슬롯 인덱스
    currentEditingSlotIndex,
    setCurrentEditingSlotIndex,
    
    // 선택된 비디오
    selectedVideoId,
    setSelectedVideoId,
    
    // 다운로드 상태
    isDownloading,
    handleDownload,
  };
}