import { Plus, X } from "lucide-react";
import Image from "next/image";
import { useState, useCallback, useRef, useEffect } from "react";
import { ERROR_MESSAGES } from "@/lib/constants/errors";

interface ImageSectionProps {
  uploadedImage?: string | null;
  onImageUpload?: (imageUrl: string) => void;
  onImageRemove?: () => void;
}

export function ImageSection({ 
  uploadedImage = null,
  onImageUpload,
  onImageRemove
}: ImageSectionProps) {
  const [localImage, setLocalImage] = useState<string | null>(uploadedImage);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 외부에서 uploadedImage prop이 변경되면 localImage 업데이트
  useEffect(() => {
    setLocalImage(uploadedImage);
  }, [uploadedImage]);

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

    try {
      // FileReader를 사용하여 base64로 변환
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const base64Url = e.target?.result as string;
        setLocalImage(base64Url);
        onImageUpload?.(base64Url);
      };
      
      reader.onerror = () => {
        setError(ERROR_MESSAGES.UPLOAD_FAILED);
      };
      
      // base64 데이터 URL로 읽기
      reader.readAsDataURL(file);

    } catch (err) {
      setError(err instanceof Error ? err.message : ERROR_MESSAGES.NETWORK_ERROR);
    }
  }, [onImageUpload]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadFile(file);
    }
    // input value를 초기화하여 동일한 파일도 다시 선택 가능하도록 함
    e.target.value = '';
  };


  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveImage = () => {
    setLocalImage(null);
    onImageRemove?.();
  };

  return (
    <div className="mb-4">
      <h2 className="text-sm font-medium mb-3 text-foreground">Image</h2>
      <div className="flex gap-1.5">
        {/* Upload button - always visible */}
        <button
          className="w-16 h-16 rounded-md flex items-center justify-center border transition-all bg-primary border-primary hover:bg-primary/90 cursor-pointer group"
          onClick={handleClick}
          aria-label="Add image"
          title="이미지 업로드"
        >
          <Plus className="w-5 h-5 text-primary-foreground" />
        </button>
        
        {/* Uploaded image slot */}
        {localImage && (
          <div className="w-16 h-16 bg-surface rounded-md overflow-hidden relative group">
            <Image
              src={localImage}
              alt="Uploaded image"
              className="w-full h-full object-cover"
              fill
              sizes="64px"
            />
            {/* 삭제 버튼 - hover 시 표시 */}
            <button
              onClick={handleRemoveImage}
              className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Remove image"
            >
              <X className="w-3 h-3 text-white" />
            </button>
          </div>
        )}
      </div>
      
      {/* 숨겨진 파일 입력 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png"
        onChange={handleFileSelect}
        className="hidden"
      />
      
      {/* 에러 메시지 표시 */}
      {error && (
        <div className="mt-2 text-xs text-destructive">
          {error}
        </div>
      )}
    </div>
  );
}