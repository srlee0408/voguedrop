import { Plus, Video } from "lucide-react";
import Image from "next/image";
import { useState, useCallback, useRef } from "react";
import { ERROR_MESSAGES } from "@/lib/constants/errors";
import type { GeneratedVideo } from "@/types/canvas";
import { GeneratingOverlay } from "./GeneratingOverlay";

interface ImageSectionProps {
  onImageUpload?: (imageUrl: string) => void;
  generatedVideos?: GeneratedVideo[];
  isGenerating?: boolean;
}

export function ImageSection({ 
  onImageUpload,
  generatedVideos = [],
  isGenerating = false
}: ImageSectionProps) {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 모든 미디어를 하나의 배열로 관리 (업로드 이미지 + 생성된 비디오)
  const allMedia = [
    ...(uploadedImage ? [{ type: 'image' as const, url: uploadedImage }] : []),
    ...generatedVideos.map(v => ({ type: 'video' as const, url: v.url, id: v.id }))
  ].slice(0, 3); // 최대 3개까지만 표시

  const validateFile = (file: File): string | null => {
    // 파일 타입 검증
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      return ERROR_MESSAGES.INVALID_FORMAT;
    }
    
    // 파일 크기 검증 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      return ERROR_MESSAGES.FILE_TOO_LARGE;
    }
    
    return null;
  };

  const uploadFile = useCallback(async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/canvas/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || ERROR_MESSAGES.UPLOAD_FAILED);
      }

      const data = await response.json();
      setUploadedImage(data.url);
      onImageUpload?.(data.url);

    } catch (err) {
      setError(err instanceof Error ? err.message : ERROR_MESSAGES.NETWORK_ERROR);
    }
  }, [onImageUpload]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadFile(file);
    }
  };


  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="mb-4">
      <h2 className="text-sm font-medium mb-3 text-foreground">Image</h2>
      <div className="grid grid-cols-4 gap-1.5">
        {/* Add image button */}
        <button
          className="aspect-square bg-primary rounded-md flex items-center justify-center border border-primary hover:bg-primary/90 transition-colors group"
          onClick={handleClick}
          aria-label="Add image"
        >
          <Plus className="w-5 h-5 text-primary-foreground" />
        </button>
        
        {/* 숨겨진 파일 입력 */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png"
          onChange={handleFileSelect}
          className="hidden"
        />
        
        {/* 미디어 썸네일 리스트 (최대 3개) */}
        {allMedia.slice(0, 3).map((media, index) => (
          <div
            key={`media-${index}`}
            className="aspect-square bg-surface rounded-md overflow-hidden relative hover:ring-1 hover:ring-muted-foreground transition-all"
          >
            {media.type === 'video' ? (
              <>
                <video
                  src={media.url}
                  className="w-full h-full object-cover pointer-events-none"
                  muted
                />
                {/* 비디오 아이콘 오버레이 */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <Video className="w-4 h-4 text-white/80" />
                </div>
              </>
            ) : (
              <Image
                src={media.url}
                alt={`Media ${index + 1}`}
                className="w-full h-full object-cover"
                fill
                sizes="(max-width: 768px) 25vw, (max-width: 1200px) 20vw, 15vw"
              />
            )}
            
            {/* Generating overlay (when media is being generated) */}
            {isGenerating && index === allMedia.length - 1 && (
              <GeneratingOverlay isGenerating={true} />
            )}
          </div>
        ))}
        
        {/* 빈 슬롯들 */}
        {Array.from({ length: Math.max(0, 3 - allMedia.length) }).map((_, index) => (
          <div
            key={`empty-${index}`}
            className="aspect-square bg-surface rounded-md"
          />
        ))}
      </div>
      
      {/* 에러 메시지 표시 */}
      {error && (
        <div className="mt-2 text-xs text-destructive">
          {error}
        </div>
      )}
    </div>
  );
}