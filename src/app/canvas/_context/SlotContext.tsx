'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useSlotManager } from '../_hooks/useSlotManager';
import type { SlotManagerReturn } from '../_types';

/**
 * SlotContext - Canvas 4개 슬롯 시스템 관리
 * 
 * @description
 * Canvas에서 4개의 독립적인 슬롯을 관리하며, 각 슬롯은 이미지 업로드,
 * AI 생성, 즐겨찾기 등의 상태를 가집니다. 슬롯 간 전환과 상태 동기화를 처리합니다.
 * 
 * @manages
 * - slots: 4개 슬롯의 상태 배열 (이미지 URL, 생성 상태, 메타데이터)
 * - activeSlotIndex: 현재 활성화된 슬롯 인덱스 (0-3)
 * - isSlotGenerating: 각 슬롯의 AI 생성 진행 상태
 * - slotImages: 각 슬롯에 업로드된 이미지 URL
 * 
 * @features
 * - 이미지 업로드 및 슬롯 할당
 * - AI 비디오 생성 상태 추적
 * - 슬롯 간 전환 및 활성화
 * - 슬롯 초기화 및 클리어
 * - 생성된 비디오 즐겨찾기 관리
 * 
 * @persistence
 * localStorage를 통해 슬롯 상태 자동 저장/복원
 */
interface SlotContextValue {
  /** 슬롯 관리 객체와 제어 함수들 */
  slotManager: SlotManagerReturn;
}

const SlotContext = createContext<SlotContextValue | undefined>(undefined);

/**
 * Canvas 슬롯 상태를 사용하는 훅
 * 
 * @returns {SlotContextValue} 슬롯 관리 객체와 제어 함수들
 * @throws {Error} SlotProvider 없이 사용할 경우 에러 발생
 * 
 * @example
 * ```tsx
 * function CanvasSlot({ index }: { index: number }) {
 *   const { slotManager } = useSlot();
 *   
 *   const handleImageUpload = (imageUrl: string) => {
 *     slotManager.handleImageUpload(imageUrl, index);
 *   };
 *   
 *   const handleSlotSwitch = () => {
 *     slotManager.setActiveSlotIndex(index);
 *   };
 *   
 *   return (
 *     <div className={slotManager.activeSlotIndex === index ? 'active' : ''}>
 *       {slotManager.slots[index]?.imageUrl && (
 *         <img src={slotManager.slots[index].imageUrl} alt="Slot content" />
 *       )}
 *     </div>
 *   );
 * }
 * ```
 *   
 *   return (
 *     <div onClick={() => slotManager.setSelectedSlotIndex(index)}>
 *       Slot {index + 1}
 *     </div>
 *   );
 * }
 * ```
 */
export function useSlot(): SlotContextValue {
  const context = useContext(SlotContext);
  if (!context) {
    throw new Error('useSlot must be used within SlotProvider');
  }
  return context;
}

/**
 * SlotProvider 컴포넌트의 Props
 * @interface SlotProviderProps
 */
interface SlotProviderProps {
  /** 하위 컴포넌트들 */
  children: ReactNode;
}

/**
 * 슬롯 관리를 담당하는 Context Provider
 * 
 * 관리하는 상태:
 * - 슬롯 콘텐츠: 각 슬롯에 배치된 이미지 또는 비디오 데이터
 * - 슬롯 상태: empty, generating, completed 중 하나
 * - 완료 시점: 각 슬롯의 생성 완료 시간 (타임스탬프)
 * - 선택된 슬롯: 현재 사용자가 선택한 슬롯 인덱스
 * - 활성 비디오: 현재 재생 중인 비디오 객체
 * 
 * 제공하는 기능:
 * - 이미지 업로드 및 슬롯 배치
 * - 히스토리 비디오 토글 및 슬롯 이동
 * - 생성 플로우 관리 (생성 시작/완료/실패)
 * - 콘텐츠 제거 및 슬롯 리셋
 * - localStorage 기반 상태 복원
 * 
 * @param {SlotProviderProps} props - Provider 속성
 * @returns {React.ReactElement} Context Provider 컴포넌트
 * 
 * @example
 * ```tsx
 * function CanvasPage() {
 *   return (
 *     <SlotProvider>
 *       <CanvasGrid />
 *       <HistoryPanel />
 *     </SlotProvider>
 *   );
 * }
 * ```
 */
export function SlotProvider({ children }: SlotProviderProps): React.ReactElement {
  const slotManager = useSlotManager();

  const contextValue: SlotContextValue = {
    slotManager,
  };

  return (
    <SlotContext.Provider value={contextValue}>
      {children}
    </SlotContext.Provider>
  );
}