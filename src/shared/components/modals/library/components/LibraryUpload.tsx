'use client';

import { useState, useCallback } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { UserUploadedVideo } from '@/shared/types/video-editor';
import { extractVideoMetadata, extractVideoThumbnail } from '@/app/video-editor/_utils/video-metadata';
import { uploadVideo } from '@/lib/api/upload';

interface LibraryUploadProps {
  onUploadComplete: (video: UserUploadedVideo) => void;
}

export function LibraryUpload({ onUploadComplete }: LibraryUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // 파일 처리를 위한 공통 함수
  const processVideoFile = useCallback(async (file: File): Promise<void> => {
    // 파일 크기 체크 (50MB for Edge Function)
    const MAX_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setError(`File size exceeds 50MB limit (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
      setTimeout(() => setError(null), 5000);
      return;
    }
    
    setIsUploading(true);
    setUploadProgress(0);
    setError(null);
    
    try {
      // 비디오 메타데이터 추출
      setUploadProgress(10);
      let metadata;
      try {
        metadata = await extractVideoMetadata(file);
        console.log('Extracted video metadata:', metadata);
      } catch (metadataError) {
        console.warn('Failed to extract video metadata:', metadataError);
        metadata = null;
      }
      
      // 썸네일 추출
      setUploadProgress(20);
      let thumbnailBlob: Blob | null = null;
      try {
        thumbnailBlob = await extractVideoThumbnail(file);
        console.log('Extracted thumbnail:', thumbnailBlob);
      } catch (thumbnailError) {
        console.warn('Failed to extract thumbnail:', thumbnailError);
      }
      
      // Convert thumbnail blob to File if exists
      const thumbnailFile = thumbnailBlob 
        ? new File([thumbnailBlob], 'thumbnail.jpg', { type: 'image/jpeg' })
        : null;
      
      // Use Edge Function for upload
      const result = await uploadVideo({
        file,
        thumbnail: thumbnailFile,
        metadata: metadata ? {
          duration: metadata.duration,
          aspectRatio: metadata.aspectRatio,
          width: metadata.width,
          height: metadata.height
        } : undefined,
        onProgress: (progress) => {
          // Map progress from upload function (10-90) to UI progress (30-90)
          const mappedProgress = 30 + (progress * 0.6);
          setUploadProgress(Math.round(mappedProgress));
        }
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Upload failed');
      }
      
      setUploadProgress(100);
      
      // Notify parent component
      if (result.video) {
        onUploadComplete(result.video);
      }
      
      // Reset after success
      setTimeout(() => {
        setUploadProgress(0);
        setIsUploading(false);
      }, 500);
      
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload video');
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [onUploadComplete]);

  // 클릭 업로드 핸들러
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    await processVideoFile(file);
    
    // Reset file input
    event.target.value = '';
  };

  // 드래그 앤 드롭 핸들러
  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    // currentTarget과 relatedTarget을 확인하여 실제로 영역을 벗어났는지 확인
    const currentTarget = e.currentTarget;
    const relatedTarget = e.relatedTarget as Node;
    
    if (!currentTarget.contains(relatedTarget)) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length === 0) return;
    
    const file = files[0];
    
    // 비디오 파일인지 확인
    if (!file.type.startsWith('video/')) {
      setError('Please drop a video file');
      setTimeout(() => setError(null), 5000);
      return;
    }
    
    await processVideoFile(file);
  }, [processVideoFile]);

  const inputId = `library-video-upload-${Date.now()}`;

  return (
    <>
      <div
        className={`
          relative w-full rounded-lg transition-all
          ${isDragging 
            ? 'border-2 border-dashed border-[#38f47cf9] bg-[#38f47cf9]/10' 
            : 'border-2 border-transparent'
          }
        `}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <button
          onClick={() => document.getElementById(inputId)?.click()}
          disabled={isUploading}
          className={`
            w-full py-3 rounded-lg transition-colors flex flex-col items-center justify-center gap-2 text-sm font-medium 
            disabled:opacity-50 disabled:cursor-not-allowed 
            ${isDragging 
              ? 'bg-[#38f47cf9]/20 text-[#38f47cf9]' 
              : 'bg-[#38f47cf9] text-black hover:bg-[#38f47cf9]/80'
            }
          `}
        >
          {isUploading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Uploading... {uploadProgress}%</span>
            </>
          ) : isDragging ? (
            <>
              <Upload className="w-6 h-6" />
              <span className="font-semibold">Drop video here</span>
              <span className="text-xs opacity-80">Release to upload</span>
            </>
          ) : (
            <>
              <Upload className="w-5 h-5" />
              <span>Upload Video</span>
              <span className="text-xs opacity-80">or drag and drop</span>
            </>
          )}
        </button>
      </div>
      
      {isUploading && (
        <div className="mt-2">
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-[#38f47cf9] h-2 rounded-full transition-all duration-300"
              style={{ 
                width: `${uploadProgress}%`
              }}
            />
          </div>
        </div>
      )}
      
      {error && (
        <div className="mt-2 p-2 bg-red-500/20 rounded text-xs text-red-400">
          {error}
        </div>
      )}
      
      <input
        id={inputId}
        type="file"
        accept="video/mp4,video/webm,video/quicktime,video/x-msvideo"
        onChange={handleFileUpload}
        className="hidden"
        disabled={isUploading}
      />
      
      <p className="text-xs text-gray-500 mt-2 text-center">
        Max file size: 50MB • Supported: MP4, WebM, MOV, AVI
      </p>
    </>
  );
}