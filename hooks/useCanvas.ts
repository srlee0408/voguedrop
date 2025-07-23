import { useState, useCallback } from 'react';

export interface CanvasImage {
  id: string;
  url: string;
  isFavorite: boolean;
}

export function useCanvas() {
  const [images, setImages] = useState<CanvasImage[]>([
    {
      id: '1',
      url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=405&h=640&fit=crop&crop=center',
      isFavorite: false,
    },
    {
      id: '2',
      url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=405&h=640&fit=crop&crop=center',
      isFavorite: false,
    },
    {
      id: '3',
      url: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=405&h=640&fit=crop&crop=center',
      isFavorite: false,
    },
  ]);

  const [thumbnails] = useState<CanvasImage[]>([
    {
      id: 't1',
      url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=80&h=80&fit=crop&crop=center',
      isFavorite: false,
    },
    {
      id: 't2',
      url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=80&h=80&fit=crop&crop=center',
      isFavorite: false,
    },
    {
      id: 't3',
      url: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=80&h=80&fit=crop&crop=center',
      isFavorite: false,
    },
    {
      id: 't4',
      url: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=80&h=80&fit=crop&crop=center',
      isFavorite: false,
    },
  ]);

  const [selectedThumbnailIndex, setSelectedThumbnailIndex] = useState(1);

  const toggleFavorite = useCallback((index: number) => {
    setImages(prev => prev.map((img, i) => 
      i === index ? { ...img, isFavorite: !img.isFavorite } : img
    ));
  }, []);

  const selectThumbnail = useCallback((index: number) => {
    setSelectedThumbnailIndex(index);
  }, []);

  const addNewImage = useCallback(() => {
    // Placeholder for adding new image functionality
    console.log('Add new image');
  }, []);

  return {
    images,
    thumbnails,
    selectedThumbnailIndex,
    toggleFavorite,
    selectThumbnail,
    addNewImage,
  };
}