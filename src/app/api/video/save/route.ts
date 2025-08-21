import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth';
import { ProjectService } from '@/lib/services/video-editor/project.service';
import { saveProjectRequestSchema, loadProjectRequestSchema } from '@/lib/services/video-editor/schemas';
import { ZodError } from 'zod';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // 1. 사용자 인증 확인
    const { user, error: authError } = await requireAuth(request);
    if (authError) {
      return authError;
    }
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. 요청 데이터 검증
    const body = await request.json();
    const validated = saveProjectRequestSchema.parse(body);

    // 3. 서비스 실행
    const service = new ProjectService();
    const result = await service.saveProject(validated, user);

    // 4. 응답 반환
    return NextResponse.json(result);

  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { 
          error: '요청 데이터가 올바르지 않습니다.',
          details: error.errors 
        },
        { status: 400 }
      );
    }

    console.error('Save API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to save project',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// 프로젝트 로드 엔드포인트
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const projectName = searchParams.get('projectName');
    const projectId = searchParams.get('projectId');
    
    if (!projectName && !projectId) {
      return NextResponse.json(
        { error: 'Project name or project ID is required' },
        { status: 400 }
      );
    }

    // 1. 사용자 인증 확인
    const { user, error: authError } = await requireAuth(request);
    if (authError) {
      return authError;
    }
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. 요청 데이터 검증
    const validated = loadProjectRequestSchema.parse({ 
      projectName: projectName || undefined, 
      projectId: projectId || undefined 
    });

    // 3. 서비스 실행
    const service = new ProjectService();
    const result = await service.loadProject(validated, user);

    // 4. 응답 반환
    return NextResponse.json(result);

  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { 
          error: 'Request data is invalid',
          details: error.errors 
        },
        { status: 400 }
      );
    }

    console.error('Load project error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to load project',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}