import React from 'react';
import { AbsoluteFill, Sequence, OffthreadVideo, Audio } from 'remotion';
import { TextClip as TextClipType, SoundClip as SoundClipType } from '@/types/video-editor';

interface VideoClip {
  id: string;
  duration: number;
  url?: string;
  title?: string;
}

interface CompositePreviewProps {
  videoClips: VideoClip[];
  textClips: TextClipType[];
  soundClips: SoundClipType[];
  pixelsPerSecond?: number;
}

export const CompositePreview: React.FC<CompositePreviewProps> = ({ 
  videoClips, 
  textClips, 
  soundClips,
  pixelsPerSecond = 40 
}) => {
  // 픽셀을 프레임으로 변환 (40px = 1초 = 30프레임)
  const pxToFrames = (px: number): number => {
    const seconds = px / pixelsPerSecond;
    return Math.round(seconds * 30); // 30fps
  };
  
  // 비디오 클립들을 순차적으로 배치
  let videoStartFrame = 0;
  const videoSequences = videoClips
    .filter(clip => clip.url) // URL이 있는 클립만 처리
    .map(clip => {
      const seq = {
        id: clip.id,
        url: clip.url!,
        title: clip.title,
        from: videoStartFrame,
        durationInFrames: pxToFrames(clip.duration)
      };
      videoStartFrame += seq.durationInFrames;
      return seq;
    });
  
  return (
    <AbsoluteFill style={{ backgroundColor: 'black' }}>
      {/* 1. 비디오 레이어 - 순차 재생 */}
      {videoSequences.map(video => (
        <Sequence
          key={video.id}
          from={video.from}
          durationInFrames={video.durationInFrames}
        >
          <OffthreadVideo 
            src={video.url}
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'cover' 
            }}
          />
        </Sequence>
      ))}
      
      {/* 2. 텍스트 오버레이 레이어 */}
      <AbsoluteFill style={{ pointerEvents: 'none', zIndex: 10 }}>
        {textClips.map(text => {
          const textFrom = pxToFrames(text.position || 0);
          const textDuration = pxToFrames(text.duration);
          
          // 텍스트 위치 계산
          const getTextPosition = () => {
            const style = text.style;
            let top = '50%';
            let left = '50%';
            let transform = 'translate(-50%, -50%)';
            
            // 수직 위치
            if (style?.verticalPosition === 'top') {
              top = '15%';
            } else if (style?.verticalPosition === 'bottom') {
              top = '85%';
            } else if (style?.positionY !== undefined) {
              top = `${style.positionY}%`;
            }
            
            // 수평 위치
            if (style?.alignment === 'left') {
              left = '10%';
              transform = 'translateY(-50%)';
            } else if (style?.alignment === 'right') {
              left = '90%';
              transform = 'translate(-100%, -50%)';
            } else if (style?.positionX !== undefined) {
              left = `${style.positionX}%`;
            }
            
            return { top, left, transform };
          };
          
          const position = getTextPosition();
          const textAlign: 'left' | 'center' | 'right' = text.style?.alignment || 'center';
          
          return (
            <Sequence
              key={text.id}
              from={textFrom}
              durationInFrames={textDuration}
            >
              <div
                style={{
                  position: 'absolute',
                  ...position,
                  maxWidth: '80%',
                  padding: text.style?.backgroundColor ? '20px 30px' : '0',
                  backgroundColor: text.style?.backgroundColor || 'transparent',
                  opacity: text.style?.backgroundOpacity ?? 1,
                  borderRadius: '8px'
                }}
              >
                <h1 style={{
                  fontSize: text.style?.fontSize || 72, // 기본 크기 증가
                  color: text.style?.color || 'white',
                  fontFamily: text.style?.fontFamily || 'sans-serif',
                  fontWeight: text.style?.fontWeight || 'bold',
                  textShadow: `
                    3px 3px 6px rgba(0,0,0,0.9),
                    -1px -1px 2px rgba(0,0,0,0.5),
                    1px -1px 2px rgba(0,0,0,0.5),
                    -1px 1px 2px rgba(0,0,0,0.5),
                    1px 1px 2px rgba(0,0,0,0.5)
                  `, // 더 강한 그림자
                  textAlign,
                  margin: 0,
                  lineHeight: 1.2,
                  // 텍스트 효과 추가
                  ...(text.effect === 'fade' && {
                    animation: 'fadeIn 0.5s ease-in'
                  }),
                  ...(text.effect === 'slide' && {
                    animation: 'slideIn 0.5s ease-out'
                  }),
                  ...(text.effect === 'glow' && {
                    filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.7))'
                  })
                }}>
                  {text.content}
                </h1>
              </div>
            </Sequence>
          );
        })}
      </AbsoluteFill>
      
      {/* 3. 오디오 레이어 - 동시 재생 가능 */}
      {soundClips.map(sound => {
        if (!sound.url) return null;
        
        const audioFrom = pxToFrames(sound.position || 0);
        const audioDuration = pxToFrames(sound.duration);
        
        return (
          <Sequence
            key={sound.id}
            from={audioFrom}
            durationInFrames={audioDuration}
          >
            <Audio 
              src={sound.url} 
              volume={(sound.volume || 100) / 100}
            />
          </Sequence>
        );
      })}
      
      {/* CSS 애니메이션 정의 */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideIn {
          from { transform: translateY(50px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </AbsoluteFill>
  );
};