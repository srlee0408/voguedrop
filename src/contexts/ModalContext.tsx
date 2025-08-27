/**
 * ModalContext - 전역 모달 상태 관리 컨텍스트
 * 
 * 주요 역할:
 * 1. 애플리케이션 전체에서 사용되는 모달들의 상태 중앙 관리
 * 2. 다양한 모달 타입별 open/close 상태 제어
 * 3. React Context API를 통한 전역 상태 공유
 * 4. 모달 간 상호작용 및 충돌 방지를 위한 통합 관리
 * 
 * 핵심 특징:
 * - 7가지 주요 모달 타입 지원 (라이브러리, 효과, 프롬프트, 카메라, 모델, 브러시, 프롬프터)
 * - 각 모달별 독립적인 상태 관리
 * - 커스텀 훅(useModal)을 통한 편리한 접근
 * - 타입 안전성을 위한 TypeScript 인터페이스 정의
 * 
 * 주의사항:
 * - useModal 훅은 반드시 ModalProvider 내부에서 사용해야 함
 * - 여러 모달이 동시에 열리는 경우 z-index 관리 필요
 * - 모달 상태 변경 시 리렌더링 최적화 고려
 */
"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

interface ModalContextType {
  isLibraryOpen: boolean;
  setIsLibraryOpen: (open: boolean) => void;
  isEffectModalOpen: boolean;
  setIsEffectModalOpen: (open: boolean) => void;
  isPromptModalOpen: boolean;
  setIsPromptModalOpen: (open: boolean) => void;
  isCameraModalOpen: boolean;
  setIsCameraModalOpen: (open: boolean) => void;
  isModelModalOpen: boolean;
  setIsModelModalOpen: (open: boolean) => void;
  isBrushPopupOpen: boolean;
  setIsBrushPopupOpen: (open: boolean) => void;
  isPrompterOpen: boolean;
  setIsPrompterOpen: (open: boolean) => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: ReactNode }) {
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isEffectModalOpen, setIsEffectModalOpen] = useState(false);
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [isModelModalOpen, setIsModelModalOpen] = useState(false);
  const [isBrushPopupOpen, setIsBrushPopupOpen] = useState(false);
  const [isPrompterOpen, setIsPrompterOpen] = useState(false);

  const value: ModalContextType = {
    isLibraryOpen,
    setIsLibraryOpen,
    isEffectModalOpen,
    setIsEffectModalOpen,
    isPromptModalOpen,
    setIsPromptModalOpen,
    isCameraModalOpen,
    setIsCameraModalOpen,
    isModelModalOpen,
    setIsModelModalOpen,
    isBrushPopupOpen,
    setIsBrushPopupOpen,
    isPrompterOpen,
    setIsPrompterOpen,
  };

  return (
    <ModalContext.Provider value={value}>
      {children}
    </ModalContext.Provider>
  );
}

export function useModalContext() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error("useModalContext must be used within ModalProvider");
  }
  return context;
}