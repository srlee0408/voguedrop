'use client';

/**
 * @deprecated 이 파일은 리팩토링으로 인해 더 이상 사용되지 않습니다.
 * 
 * 기존의 거대한 CanvasContext가 다음과 같이 분리되었습니다:
 * - SlotContext: 슬롯 관리 (useSlot)
 * - SettingsContext: Canvas 설정 (useSettings)  
 * - ModalContext: 모달 상태 (useModals)
 * - FavoritesContext: 즐겨찾기 (useFavorites)
 * - EffectsContext: 효과 관리 (useEffects)
 * - GenerationContext: 비디오 생성 (useGeneration)
 * 
 * 사용법:
 * - import { useCanvas } from './CanvasProviders'
 * - 또는 개별 Context: import { useSlot, useSettings, ... } from './CanvasProviders'
 * 
 * 또는 특정 Context만 필요한 경우:
 * - import { useSlot } from './SlotContext'
 * - import { useSettings } from './SettingsContext'
 * - ... 등
 * 
 * 이 방식으로 각 컴포넌트는 필요한 상태만 구독하여 불필요한 리렌더링을 방지합니다.
 */

// 하위 호환성을 위해 기존 훅들 re-export
export { useSlot } from './SlotContext';
export { useSettings } from './SettingsContext';
export { useModals } from './ModalContext';
export { useFavorites } from './FavoritesContext';
export { useEffects } from './EffectsContext';
export { useGeneration } from './GenerationContext';