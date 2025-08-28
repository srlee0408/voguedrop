import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/shared/lib/api/auth';
import { ProjectService } from '@/shared/lib/services/video-editor/project.service';
import { z } from 'zod';

// 새 프로젝트 생성 요청 스키마
const createProjectRequestSchema = z.object({
  projectName: z.string().min(1, 'Project name is required').optional().default('Untitled Project'),
});

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
    const body = await request.json().catch(() => ({}));
    const validated = createProjectRequestSchema.parse(body);

    // 3. 빈 프로젝트 생성 데이터
    const emptyProjectData = {
      projectName: validated.projectName,
      videoClips: [],
      textClips: [],
      soundClips: [],
      videoLanes: [0],
      textLanes: [0],
      soundLanes: [0],
      aspectRatio: '9:16' as const,
      durationInFrames: 0,
    };

    // 4. 서비스 실행
    const service = new ProjectService();
    const result = await service.saveProject(emptyProjectData, user);

    // 5. 응답 반환
    return NextResponse.json({
      success: true,
      projectId: result.projectSaveId,
      projectName: validated.projectName,
      message: 'New project created successfully',
    });

  } catch (error) {
    console.error('Create project API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create project',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}