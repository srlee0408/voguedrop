import { Plus } from "lucide-react";
import Image from "next/image";
import { useState, useCallback, useRef } from "react";
import { ERROR_MESSAGES } from "@/lib/constants/errors";

interface ImageSectionProps {
  onImageUpload?: (imageUrl: string) => void;
  isGenerating?: boolean;
}

export function ImageSection({ 
  onImageUpload,
  isGenerating = false
}: ImageSectionProps) {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        setUploadedImage(base64Url);
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
  };


  const handleClick = () => {
    if (!isGenerating) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="mb-4">
      <h2 className="text-sm font-medium mb-3 text-foreground">Image</h2>
      <div className="flex gap-1.5">
        {/* Upload button - always visible */}
        <button
          className={`w-16 h-16 rounded-md flex items-center justify-center border transition-all ${
            isGenerating 
              ? "bg-primary/50 border-primary/50 cursor-not-allowed opacity-50" 
              : "bg-primary border-primary hover:bg-primary/90 cursor-pointer group"
          }`}
          onClick={handleClick}
          aria-label={isGenerating ? "Image upload disabled during generation" : "Add image"}
          disabled={isGenerating}
          title={isGenerating ? "영상 생성 중에는 이미지를 업로드할 수 없습니다" : "이미지 업로드"}
        >
          <Plus className="w-5 h-5 text-primary-foreground" />
        </button>
        
        {/* Uploaded image slot */}
        {uploadedImage && (
          <div className="w-16 h-16 bg-surface rounded-md overflow-hidden relative group">
            <Image
              src={uploadedImage}
              alt="Uploaded image"
              className="w-full h-full object-cover"
              fill
              sizes="64px"
            />
            
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
        disabled={isGenerating}
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