import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];

// 파일명 sanitize
function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[^a-zA-Z0-9가-힣.\-_]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_{2,}/g, '_')
    .slice(0, 100);
}

// 비디오 메타데이터 추출 (선택사항)
async function getVideoMetadata(): Promise<{
  duration?: number;
  aspect_ratio?: string;
}> {
  try {
    // 실제 구현시 ffmpeg 또는 클라이언트 사이드에서 처리
    // URL은 나중에 필요시 파라미터로 받을 수 있음
    return {};
  } catch {
    return {};
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: '파일이 없습니다.' },
        { status: 400 }
      );
    }

    // 파일 크기 검증
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `파일 크기는 20MB를 초과할 수 없습니다. (현재: ${(file.size / 1024 / 1024).toFixed(2)}MB)` },
        { status: 400 }
      );
    }

    // 파일 타입 검증
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: '지원하지 않는 파일 형식입니다. MP4, WebM, MOV 파일만 업로드 가능합니다.' },
        { status: 400 }
      );
    }

    // 파일명 생성
    const originalName = file.name;
    const sanitizedName = sanitizeFileName(originalName);
    const timestamp = Date.now();
    const fileName = `${timestamp}_${sanitizedName}`;
    const storagePath = `user-uploads/${user.id}/${fileName}`;

    // Service Client로 Storage에 업로드
    const serviceSupabase = createServiceClient();
    const fileBuffer = await file.arrayBuffer();
    const { error: uploadError } = await serviceSupabase.storage
      .from('videos')
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json(
        { error: '파일 업로드에 실패했습니다.' },
        { status: 500 }
      );
    }

    // 공개 URL 가져오기
    const { data: { publicUrl } } = serviceSupabase.storage
      .from('videos')
      .getPublicUrl(storagePath);

    // 비디오 메타데이터 추출 (선택사항)
    const metadata = await getVideoMetadata();

    // DB에 저장
    const { data: savedVideo, error: dbError } = await supabase
      .from('user_uploaded_videos')
      .insert({
        user_id: user.id,
        file_name: originalName,
        storage_path: storagePath,
        file_size: file.size,
        duration: metadata.duration,
        aspect_ratio: metadata.aspect_ratio,
        metadata: {
          mime_type: file.type,
          original_name: originalName
        },
        uploaded_at: new Date().toISOString()
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      // Storage에서 파일 삭제 (롤백)
      await serviceSupabase.storage
        .from('videos')
        .remove([storagePath]);
      
      return NextResponse.json(
        { error: '데이터베이스 저장에 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      video: {
        ...savedVideo,
        url: publicUrl
      }
    });

  } catch (error) {
    console.error('Upload API error:', error);
    return NextResponse.json(
      { error: '업로드 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 업로드된 영상 삭제
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('id');

    if (!videoId) {
      return NextResponse.json(
        { error: '비디오 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    // 소프트 삭제
    const { error } = await supabase
      .from('user_uploaded_videos')
      .update({ is_deleted: true })
      .eq('id', videoId)
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json(
        { error: '삭제에 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Delete API error:', error);
    return NextResponse.json(
      { error: '삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}