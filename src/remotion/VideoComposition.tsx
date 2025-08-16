import React from 'react';
import { Composition } from 'remotion';
import { CompositePreview } from '../../app/video-editor/_components/remotion/CompositePreview';
import { TextClip as TextClipType, SoundClip as SoundClipType } from '@/types/video-editor';

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
  pixelsPerSecond?: number;
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
        durationInFrames={900} // 30초 기본값 - Lambda 렌더링 시 API에서 전달된 실제 영상 길이로 동적 오버라이드됨 // 30초 기본값 - Lambda 렌더링 시 API에서 전달된 실제 영상 길이로 동적 오버라이드됨
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          videoClips: [],
          textClips: [],
          soundClips: [],
          pixelsPerSecond: 40,
          backgroundColor: 'black',
        }}
      />
      
      {/* 1:1 - 정사각형 */}
      <Composition
        id="video-square"
        component={CompositePreview as unknown as React.ComponentType<Record<string, unknown>>}
        durationInFrames={900} // 30초 기본값 - Lambda 렌더링 시 API에서 전달된 실제 영상 길이로 동적 오버라이드됨
        fps={30}
        width={1080}
        height={1080}
        defaultProps={{
          videoClips: [],
          textClips: [],
          soundClips: [],
          pixelsPerSecond: 40,
          backgroundColor: 'black',
        }}
      />
      
      {/* 16:9 - 가로 */}
      <Composition
        id="video-wide"
        component={CompositePreview as unknown as React.ComponentType<Record<string, unknown>>}
        durationInFrames={900} // 30초 기본값 - Lambda 렌더링 시 API에서 전달된 실제 영상 길이로 동적 오버라이드됨
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          videoClips: [],
          textClips: [],
          soundClips: [],
          pixelsPerSecond: 40,
          backgroundColor: 'black',
        }}
      />
    </>
  );
};