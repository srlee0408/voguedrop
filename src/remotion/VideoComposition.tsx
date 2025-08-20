import React from 'react';
import { Composition } from 'remotion';
import { CompositePreview } from '../app/video-editor/_components/remotion/CompositePreview';
import { TextClip as TextClipType, SoundClip as SoundClipType } from '@/types/video-editor';
// CSS import 제거 - inject-fonts.ts에서 처리

interface VideoClip {
  id: string;
  duration: number;
  position?: number;
  url?: string;
  title?: string;
  startTime?: number;
  endTime?: number;
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