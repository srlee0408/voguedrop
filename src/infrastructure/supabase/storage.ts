import { supabase } from './client';

/**
 * Supabase Storage에 이미지를 업로드하고 공개 URL을 반환합니다.
 */
export async function uploadImage(file: File, userId: string = 'anonymous'): Promise<string> {
  try {
    // 파일명 생성 (timestamp + random string)
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(7);
    const fileExt = file.name.split('.').pop();
    // 새로운 경로 구조: image/{userId}/{filename}
    const fileName = `image/${userId}/${timestamp}-${randomString}.${fileExt}`;

    // Supabase Storage에 업로드 (user-upload 버킷으로 통일)
    const { error } = await supabase.storage
      .from('user-uploads') // 버킷 이름 통일
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) {
      console.error('Storage upload error:', error);
      throw new Error('이미지 업로드에 실패했습니다.');
    }

    // 공개 URL 가져오기
    const { data: { publicUrl } } = supabase.storage
      .from('user-uploads')
      .getPublicUrl(fileName);

    return publicUrl;
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
}

/**
 * Base64 이미지를 Blob으로 변환합니다.
 */
export function base64ToBlob(base64: string): Blob {
  // data:image/jpeg;base64, 부분 제거
  const base64Data = base64.split(',')[1];
  const mimeType = base64.match(/data:([^;]+);/)?.[1] || 'image/jpeg';
  
  // base64를 binary로 변환
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  return new Blob([bytes], { type: mimeType });
}

/**
 * Base64 이미지를 Supabase Storage에 업로드하고 URL을 반환합니다.
 */
export async function uploadBase64Image(base64: string, userId: string = 'anonymous'): Promise<string> {
  // Base64를 Blob으로 변환
  const blob = base64ToBlob(base64);
  
  // File 객체로 변환
  const file = new File([blob], 'upload.jpg', { type: blob.type });
  
  // 업로드 (동일한 uploadImage 함수 사용으로 자동으로 새 경로 구조 적용)
  return uploadImage(file, userId);
}