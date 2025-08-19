'use client';

import { useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { UserUploadedVideo } from '@/types/video-editor';
import { extractVideoMetadata, extractVideoThumbnail } from '@/app/video-editor/_utils/video-metadata';

interface LibraryUploadProps {
  onUploadComplete: (video: UserUploadedVideo) => void;
}

export function LibraryUpload({ onUploadComplete }: LibraryUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // 파일 크기 체크 (20MB)
    const MAX_SIZE = 20 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setError(`File size exceeds 20MB limit (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
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
      
      const formData = new FormData();
      formData.append('file', file);
      
      // 썸네일이 있으면 추가
      if (thumbnailBlob) {
        const thumbnailFile = new File([thumbnailBlob], 'thumbnail.jpg', { type: 'image/jpeg' });
        formData.append('thumbnail', thumbnailFile);
      }
      
      // 메타데이터가 있으면 추가
      if (metadata) {
        formData.append('duration', metadata.duration.toString());
        formData.append('aspectRatio', metadata.aspectRatio);
        formData.append('width', metadata.width.toString());
        formData.append('height', metadata.height.toString());
      }
      
      // Upload progress simulation
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);
      
      const response = await fetch('/api/upload/video', {
        method: 'POST',
        body: formData,
      });
      
      clearInterval(progressInterval);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }
      
      const data = await response.json();
      setUploadProgress(100);
      
      // Notify parent component
      if (data.video) {
        onUploadComplete(data.video);
      }
      
      // Reset after success
      setTimeout(() => {
        setUploadProgress(0);
        setIsUploading(false);
      }, 500);
      
      // Reset file input
      event.target.value = '';
      
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload video');
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const inputId = `library-video-upload-${Date.now()}`;

  return (
    <>
      <button
        onClick={() => document.getElementById(inputId)?.click()}
        disabled={isUploading}
        className="w-full py-3 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed bg-[#38f47cf9] text-black hover:bg-[#38f47cf9]/80"
      >
        {isUploading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Uploading... {uploadProgress}%</span>
          </>
        ) : (
          <>
            <Upload className="w-4 h-4" />
            <span>Upload Video</span>
          </>
        )}
      </button>
      
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
        Max file size: 20MB
      </p>
    </>
  );
}