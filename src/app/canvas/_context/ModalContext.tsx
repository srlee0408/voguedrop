'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useModalManager } from '../_hooks/useModalManager';
import type { ModalManagerReturn } from '../_types';

/**
 * Modal Context의 값 타입
 * @interface ModalContextValue
 */
interface ModalContextValue {
  /** 모달 관리 객체와 제어 함수들 */
  modals: ModalManagerReturn;
}

const ModalContext = createContext<ModalContextValue | undefined>(undefined);

/**
 * Canvas 모달 상태를 사용하는 훅
 * @returns {ModalContextValue} 모달 관리 객체와 제어 함수들
 * @throws {Error} ModalProvider 없이 사용할 경우 에러 발생
 * 
 * @example
 * ```tsx
 * function HeaderButton() {
 *   const { modals } = useModals();
 *   
 *   return (
 *     <button onClick={() => modals.openModal('library')}>
 *       라이브러리 열기
 *     </button>
 *   );
 * }
 * ```
 */
export function useModals(): ModalContextValue {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModals must be used within ModalProvider');
  }
  return context;
}

/**
 * ModalProvider 컴포넌트의 Props
 * @interface ModalProviderProps
 */
interface ModalProviderProps {
  /** 하위 컴포넌트들 */
  children: ReactNode;
}

/**
 * 모달 상태 관리를 담당하는 Context Provider
 * 
 * 관리하는 모달:
 * - library: 히스토리 라이브러리 모달
 * - effect: 효과 선택 모달  
 * - prompt: 프롬프트 입력 모달
 * - camera: 카메라 캡처 모달
 * - model: AI 모델 선택 모달
 * - projectTitle: 프로젝트 제목 입력 모달
 * - imageBrush: 이미지 브러시 편집 모달
 * 
 * 제공하는 기능:
 * - 개별 모달 열기/닫기/토글
 * - 모든 모달 일괄 닫기
 * - 모달 상태 체크
 * 
 * @param {ModalProviderProps} props - Provider 속성
 * @returns {React.ReactElement} Context Provider 컴포넌트
 * 
 * @example
 * ```tsx
 * function CanvasLayout() {
 *   return (
 *     <ModalProvider>
 *       <CanvasHeader />
 *       <CanvasGrid />
 *       <AllModals />
 *     </ModalProvider>
 *   );
 * }
 * ```
 */
export function ModalProvider({ children }: ModalProviderProps): React.ReactElement {
  const modals = useModalManager();

  const contextValue: ModalContextValue = {
    modals,
  };

  return (
    <ModalContext.Provider value={contextValue}>
      {children}
    </ModalContext.Provider>
  );
}