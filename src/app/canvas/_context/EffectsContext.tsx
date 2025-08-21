'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useEffectsManager } from '../_hooks/useEffectsManager';
import type { EffectsManagerReturn } from '../_types';

/**
 * EffectsContext - Canvas AI 효과 선택 및 관리
 * 
 * @description
 * Canvas에서 AI 비디오 생성에 사용할 효과를 선택하고 관리합니다.
 * 카테고리별 효과 브라우징, 선택, 프롬프트 조합 등을 처리합니다.
 * 
 * @manages
 * - selectedEffects: 현재 선택된 효과 목록 (최대 2개)
 * - availableEffects: 사용 가능한 모든 효과 템플릿
 * - categories: 효과 카테고리 목록
 * - selectedCategory: 현재 선택된 카테고리
 * 
 * @features
 * - 효과 선택/해제 (최대 2개 제한)
 * - 카테고리별 효과 필터링
 * - 선택된 효과 프롬프트 자동 조합
 * - 효과 미리보기 및 설명 표시
 * 
 * @constraints
 * - 최대 2개 효과까지 동시 선택 가능
 * - 효과 간 호환성 검증
 * - 카테고리별 효과 제한 적용
 */
interface EffectsContextValue {
  /** 효과 관리 객체와 제어 함수들 */
  effects: EffectsManagerReturn;
}

const EffectsContext = createContext<EffectsContextValue | undefined>(undefined);

/**
 * Canvas 효과 상태를 사용하는 훅
 * 
 * @returns {EffectsContextValue} 효과 관리 객체와 제어 함수들
 * @throws {Error} EffectsProvider 없이 사용할 경우 에러 발생
 * 
 * @example
 * ```tsx
 * function EffectSelector() {
 *   const { effects } = useEffects();
 *   
 *   const handleEffectToggle = (effectId: number) => {
 *     if (effects.selectedEffects.includes(effectId)) {
 *       effects.removeEffect(effectId);
 *     } else {
 *       effects.addEffect(effectId);
 *     }
 *   };
 *   
 *   return (
 *     <div>
 *       {effects.availableEffects.map(effect => (
 *         <button 
 *           key={effect.id}
 *           onClick={() => handleEffectToggle(effect.id)}
 *           className={effects.selectedEffects.includes(effect.id) ? 'selected' : ''}
 *         >
 *           {effect.name}
 *         </button>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
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