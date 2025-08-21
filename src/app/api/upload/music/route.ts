import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/shared/lib/supabase/server';
import { createServiceClient } from '@/shared/lib/supabase/service';
import { requireAuth } from '@/lib/api/auth';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  'audio/mpeg',       // .mp3
  'audio/mp3',        // .mp3 (alternative)
  'audio/wav',        // .wav
  'audio/x-wav',      // .wav (alternative)
  'audio/mp4',        // .m4a
  'audio/x-m4a',      // .m4a (alternative)
  'audio/ogg',        // .ogg
  'audio/webm',       // .webm
  'audio/flac',       // .flac
  'audio/x-flac'      // .flac (alternative)
];

// 파일명 sanitize
function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[^a-zA-Z0-9가-힣.\-_]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_{2,}/g, '_')
    .slice(0, 100);
}

export async function POST(request: NextRequest) {
  try {
    // 사용자 인증 확인 (보안 유틸리티 사용)
    const { user, error: authError } = await requireAuth(request);
    if (authError) {
      return authError;
    }
    
    if (!user) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    // 클라이언트에서 전송한 메타데이터 추출
    const duration = formData.get('duration') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: '파일이 없습니다.' },
        { status: 400 }
      );
    }

    // 파일 크기 검증
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `파일 크기는 10MB를 초과할 수 없습니다. (현재: ${(file.size / 1024 / 1024).toFixed(2)}MB)` },
        { status: 400 }
      );
    }

    // 파일 타입 검증
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: '지원하지 않는 파일 형식입니다. MP3, WAV, M4A, OGG, WebM, FLAC 파일만 업로드 가능합니다.' },
        { status: 400 }
      );
    }

    // 파일명 생성
    const originalName = file.name;
    const sanitizedName = sanitizeFileName(originalName);
    const timestamp = Date.now();
    const fileName = `${timestamp}_${sanitizedName}`;
    const storagePath = `music/${user.id}/${fileName}`;

    // Storage 업로드는 Service Client가 필요 (RLS가 Storage에 적용되지 않음)
    const serviceSupabase = createServiceClient();
    const fileBuffer = await file.arrayBuffer();
    const { error: uploadError } = await serviceSupabase.storage
      .from('user-uploads')
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
      .from('user-uploads')
      .getPublicUrl(storagePath);

    // DB에 저장 (Service Client + user_id 조건으로 보안 강화)
    const { data: savedMusic, error: dbError } = await serviceSupabase
      .from('user_uploaded_music')
      .insert({
        user_id: user.id, // user_id 포함으로 소유권 보장
        file_name: originalName,
        storage_path: storagePath,
        file_size: file.size,
        duration: duration ? parseFloat(duration) : null,
        metadata: {
          mime_type: file.type,
          original_name: originalName
        },
        uploaded_at: new Date().toISOString()
      })
      .select('*')
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      // Storage에서 파일 삭제 (롤백)
      await serviceSupabase.storage
        .from('user-uploads')
        .remove([storagePath]);
      
      return NextResponse.json(
        { error: '데이터베이스 저장에 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      music: {
        ...savedMusic,
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

// 업로드된 음악 조회
export async function GET(request: NextRequest) {
  try {
    // 사용자 인증 확인 (보안 유틸리티 사용)
    const { user, error: authError } = await requireAuth(request);
    if (authError) {
      return authError;
    }
    
    if (!user) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }
    
    const supabase = await createClient();

    const { searchParams } = new URL(request.url);
    const genre = searchParams.get('genre');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('user_uploaded_music')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_deleted', false)
      .order('uploaded_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (genre) {
      query = query.eq('genre', genre);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Query error:', error);
      return NextResponse.json(
        { error: '음악 목록을 불러오는데 실패했습니다.' },
        { status: 500 }
      );
    }

    // Storage URL 추가 (Storage는 공개 정보이므로 Service Client 사용 필수)
    const serviceSupabase = createServiceClient();
    const musicWithUrls = data?.map(music => {
      const { data: { publicUrl } } = serviceSupabase.storage
        .from('user-uploads')
        .getPublicUrl(music.storage_path);
      
      return {
        ...music,
        url: publicUrl
      };
    }) || [];

    return NextResponse.json({
      success: true,
      music: musicWithUrls,
      total: musicWithUrls.length
    });

  } catch (error) {
    console.error('Get API error:', error);
    return NextResponse.json(
      { error: '음악 목록 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 업로드된 음악 삭제
export async function DELETE(request: NextRequest) {
  try {
    // 사용자 인증 확인 (보안 유틸리티 사용)
    const { user, error: authError } = await requireAuth(request);
    if (authError) {
      return authError;
    }
    
    if (!user) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const musicId = searchParams.get('id');

    if (!musicId) {
      return NextResponse.json(
        { error: '음악 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    // 소프트 삭제 (Service Client + user_id 조건으로 소유권 검증)
    const serviceSupabase = createServiceClient();
    const { error } = await serviceSupabase
      .from('user_uploaded_music')
      .update({ is_deleted: true })
      .eq('id', musicId)
      .eq('user_id', user.id); // 보안: 소유권 확인

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