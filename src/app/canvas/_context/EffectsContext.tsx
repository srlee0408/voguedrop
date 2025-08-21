'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useEffectsManager } from '../_hooks/useEffectsManager';
import type { EffectsManagerReturn } from '../_types';

/**
 * Effects Context의 값 타입
 * @interface EffectsContextValue
 */
interface EffectsContextValue {
  /** 효과 관리 객체와 제어 함수들 */
  effects: EffectsManagerReturn;
}

const EffectsContext = createContext<EffectsContextValue | undefined>(undefined);

/**
 * Canvas 효과 상태를 사용하는 훅
 * @returns {EffectsContextValue} 효과 관리 객체와 제어 함수들
 * @throws {Error} EffectsProvider 없이 사용할 경우 에러 발생
 * 
 * @example
 * ```tsx
 * function EffectSelector({ effect }: { effect: EffectTemplateWithMedia }) {
 *   const { effects } = useEffects();
 *   
 *   const handleEffectClick = () => {
 *     if (effects.selectedEffects.some(e => e.id === effect.id)) {
 *       effects.removeEffect(effect.id);
 *     } else if (effects.canAddMore) {
 *       effects.addEffect(effect);
 *     }
 *   };
 *   
 *   const isSelected = effects.selectedEffects.some(e => e.id === effect.id);
 *   
 *   return (
 *     <button 
 *       onClick={handleEffectClick}
 *       disabled={!effects.canAddMore && !isSelected}
 *       className={isSelected ? 'selected' : ''}
 *     >
 *       {effect.name}
 *     </button>
 *   );
 * }
 * ```
 */
export function useEffects(): EffectsContextValue {
  const context = useContext(EffectsContext);
  if (!context) {
    throw new Error('useEffects must be used within EffectsProvider');
  }
  return context;
}

/**
 * EffectsProvider 컴포넌트의 Props
 * @interface EffectsProviderProps
 */
interface EffectsProviderProps {
  /** 하위 컴포넌트들 */
  children: ReactNode;
}

/**
 * 효과 선택 및 관리를 담당하는 Context Provider
 * 
 * 관리하는 상태:
 * - 선택된 효과 배열: AI 영상 생성에 적용될 효과 템플릿들 (최대 2개)
 * - 추가 가능 여부: 현재 더 많은 효과를 선택할 수 있는지 여부
 * - 최대 효과 수: 선택 가능한 최대 효과 개수 (기본값: 2)
 * 
 * 제공하는 기능:
 * - 효과 추가: 새로운 효과를 선택 목록에 추가
 * - 효과 제거: 선택된 효과를 목록에서 제거
 * - 효과 토글: 선택/해제 상태를 토글
 * - 모든 효과 제거: 선택된 모든 효과 클리어
 * - 효과 복원: localStorage 등에서 이전 선택 상태 복원
 * 
 * @param {EffectsProviderProps} props - Provider 속성
 * @returns {React.ReactElement} Context Provider 컴포넌트
 * 
 * @example
 * ```tsx
 * function CanvasPage() {
 *   return (
 *     <EffectsProvider>
 *       <EffectsGallery />
 *       <SelectedEffectsDisplay />
 *     </EffectsProvider>
 *   );
 * }
 * ```
 */
export function EffectsProvider({ children }: EffectsProviderProps): React.ReactElement {
  const effects = useEffectsManager();

  const contextValue: EffectsContextValue = {
    effects,
  };

  return (
    <EffectsContext.Provider value={contextValue}>
      {children}
    </EffectsContext.Provider>
  );
}