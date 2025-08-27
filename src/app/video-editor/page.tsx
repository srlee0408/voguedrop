'use client'

import { VideoEditorProviders } from './_context/Providers';
import VideoEditorClient from './_components/VideoEditorClient';
import { AuthGuard } from '@/app/canvas/_components/AuthGuard';

/**
 * Video Editor 페이지 엔트리 포인트
 * 
 * 주요 역할:
 * 1. 인증된 사용자만 접근 가능하도록 AuthGuard 적용
 * 2. Video Editor Context 제공자들 구성
 * 3. Video Editor 클라이언트 컴포넌트 렌더링
 * 
 * 핵심 특징:
 * - AuthGuard로 이중 인증 보안 (middleware + 클라이언트)
 * - VideoEditorProviders로 필요한 Context들 제공
 * - 클라이언트 컴포넌트로 동작하여 실시간 상태 관리
 * 
 * 주의사항:
 * - AuthGuard는 클라이언트 컴포넌트이므로 'use client' 필요
 * - middleware.ts에서 1차 보호, AuthGuard에서 2차 보호
 */
export default function VideoEditorPage() {
  return (
    <AuthGuard>
      <VideoEditorProviders>
        <VideoEditorClient />
      </VideoEditorProviders>
    </AuthGuard>
  );
}