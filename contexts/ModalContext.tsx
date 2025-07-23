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