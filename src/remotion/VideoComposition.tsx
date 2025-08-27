/**
 * VideoComposition - Remotion 비디오 컴포지션 정의
 * 
 * 주요 역할:
 * 1. Remotion 프레임워크를 위한 비디오 컴포지션 등록
 * 2. 비디오 편집기에서 생성된 클립들의 렌더링 구조 정의
 * 3. 영상, 텍스트, 사운드 클립들의 조합 및 배치 관리
 * 4. 최종 영상 출력을 위한 렌더링 설정 제공
 * 
 * 핵심 특징:
 * - 멀티 트랙 지원으로 복잡한 영상 구성 가능
 * - 동적 컴포지션 속성(해상도, FPS, 길이) 설정
 * - 레인 인덱스 기반 다중 트랙 레이아웃
 * - CSS 폰트 주입 시스템과 연동
 * - CompositePreview 컴포넌트를 통한 실제 렌더링
 * 
 * 주의사항:
 * - Remotion Studio와 서버 렌더링 환경 모두 지원
 * - 폰트 로딩은 inject-fonts.ts에서 별도 처리
 * - 컴포지션 길이는 모든 클립을 고려하여 동적 계산
 * - 클립 겹침 및 레이어 순서 관리 중요
 */
import React from 'react';
import { Composition } from 'remotion';
import { CompositePreview } from '../app/video-editor/_components/remotion/CompositePreview';
import { TextClip as TextClipType, SoundClip as SoundClipType } from '@/shared/types/video-editor';
// CSS import 제거 - inject-fonts.ts에서 처리

interface VideoClip {
  id: string;
  duration: number;
  position?: number;
  url?: string;
  title?: string;
  startTime?: number;
  endTime?: number;
  laneIndex?: number;  // 레인 인덱스 추가
}

export interface VideoCompositionProps {
  videoClips: VideoClip[];
  textClips: TextClipType[];
  soundClips: SoundClipType[];
  backgroundColor?: string;
  width: number;
  height: number;
  fps: number;
  durationInFrames: number;
}

// 메인 비디오 컴포지션
export const VideoComposition: React.FC = () => {
  return (
    <>
      {/* 9:16 - 모바일 세로 */}
      <Composition
        id="video-mobile"
        component={CompositePreview as unknown as React.ComponentType<Record<string, unknown>>}
        durationInFrames={3600} // 120초(2분) 기본값 - Lambda 렌더링 시 frameRange로 실제 필요한 부분만 렌더링
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          videoClips: [],
          textClips: [],
          soundClips: [],
          backgroundColor: 'black',
        }}
      />
      
      {/* 1:1 - 정사각형 */}
      <Composition
        id="video-square"
        component={CompositePreview as unknown as React.ComponentType<Record<string, unknown>>}
        durationInFrames={3600} // 120초(2분) 기본값 - Lambda 렌더링 시 frameRange로 실제 필요한 부분만 렌더링
        fps={30}
        width={1080}
        height={1080}
        defaultProps={{
          videoClips: [],
          textClips: [],
          soundClips: [],
          backgroundColor: 'black',
        }}
      />
      
      {/* 16:9 - 가로 */}
      <Composition
        id="video-wide"
        component={CompositePreview as unknown as React.ComponentType<Record<string, unknown>>}
        durationInFrames={3600} // 120초(2분) 기본값 - Lambda 렌더링 시 frameRange로 실제 필요한 부분만 렌더링
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          videoClips: [],
          textClips: [],
          soundClips: [],
          backgroundColor: 'black',
        }}
      />
    </>
  );
};