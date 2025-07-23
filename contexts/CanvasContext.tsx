"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { CanvasImage, useCanvas } from "@/hooks/useCanvas";

interface CanvasContextType {
  images: CanvasImage[];
  thumbnails: CanvasImage[];
  selectedThumbnailIndex: number;
  toggleFavorite: (index: number) => void;
  selectThumbnail: (index: number) => void;
  addNewImage: () => void;
  brushSize: number;
  setBrushSize: (size: number) => void;
  selectedResolution: string;
  setSelectedResolution: (resolution: string) => void;
  selectedSize: string;
  setSelectedSize: (size: string) => void;
}

const CanvasContext = createContext<CanvasContextType | undefined>(undefined);

export function CanvasProvider({ children }: { children: ReactNode }) {
  const canvas = useCanvas();
  const [brushSize, setBrushSize] = useState(50);
  const [selectedResolution, setSelectedResolution] = useState("16:9");
  const [selectedSize, setSelectedSize] = useState("1920×1080");

  const value: CanvasContextType = {
    ...canvas,
    brushSize,
    setBrushSize,
    selectedResolution,
    setSelectedResolution,
    selectedSize,
    setSelectedSize,
  };

  return (
    <CanvasContext.Provider value={value}>
      {children}
    </CanvasContext.Provider>
  );
}

export function useCanvasContext() {
  const context = useContext(CanvasContext);
  if (!context) {
    throw new Error("useCanvasContext must be used within CanvasProvider");
  }
  return context;
}