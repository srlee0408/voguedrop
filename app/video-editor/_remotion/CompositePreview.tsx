import React from 'react';
import { AbsoluteFill, Sequence, OffthreadVideo, Audio } from 'remotion';
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

interface CompositePreviewProps {
  videoClips: VideoClip[];
  textClips: TextClipType[];
  soundClips: SoundClipType[];
  pixelsPerSecond?: number;
  backgroundColor?: string;
}

export const CompositePreview: React.FC<CompositePreviewProps> = ({ 
  videoClips, 
  textClips, 
  soundClips,
  pixelsPerSecond = 40,
  backgroundColor = 'black'
}) => {
  // 픽셀을 프레임으로 변환 (40px = 1초 = 30프레임)
  const pxToFrames = (px: number): number => {
    const seconds = px / pixelsPerSecond;
    return Math.round(seconds * 30); // 30fps
  };
  
  // 비디오 클립들을 position 기반으로 배치
  const videoSequences = videoClips
    .filter(clip => clip.url) // URL이 있는 클립만 처리
    .map(clip => {
      // 시작/종료 시간을 프레임으로 변환
      const startFrom = clip.startTime ? Math.round(clip.startTime * 30) : 0;
      const endAt = clip.endTime ? Math.round(clip.endTime * 30) : undefined;
      
      const seq = {
        id: clip.id,
        url: clip.url!,
        title: clip.title,
        from: pxToFrames(clip.position || 0), // position 값을 사용하여 시작 위치 결정
        durationInFrames: pxToFrames(clip.duration),
        startFrom,
        endAt
      };
      return seq;
    });
  
  return (
    <AbsoluteFill style={{ backgroundColor }}>
      {/* 1. 비디오 레이어 - 순차 재생 */}
      {videoSequences.map(video => (
        <Sequence
          key={video.id}
          from={video.from}
          durationInFrames={video.durationInFrames}
          premountFor={300} // 10초(300프레임) 미리 마운트하여 충분한 프리로딩 시간 확보
        >
          <OffthreadVideo 
            src={video.url}
            startFrom={video.startFrom}
            endAt={video.endAt}
            pauseWhenBuffering={true} // 버퍼링 시 일시정지하여 끊김 방지
            onError={(e) => {
              console.error(`Video loading error for ${video.id}:`, e);
            }}
            // 첫 번째 비디오는 즉시 로드, 나머지는 순차적으로
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
            
            // positionX와 positionY가 있으면 우선 사용
            if (style?.positionX !== undefined && style?.positionY !== undefined) {
              left = `${style.positionX}%`;
              top = `${style.positionY}%`;
              transform = 'translate(-50%, -50%)';
            } else {
              // 수직 위치
              if (style?.verticalPosition === 'top') {
                top = '15%';
              } else if (style?.verticalPosition === 'bottom') {
                top = '85%';
              }
              
              // 수평 위치
              if (style?.alignment === 'left') {
                left = '10%';
                transform = 'translateY(-50%)';
              } else if (style?.alignment === 'right') {
                left = '90%';
                transform = 'translate(-100%, -50%)';
              }
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
                  color: text.effect === 'gradient' ? 'transparent' : (text.style?.color || 'white'),
                  fontFamily: text.style?.fontFamily || 'sans-serif',
                  fontWeight: text.style?.fontWeight || 'bold',
                  textShadow: text.effect === 'gradient' || text.effect === 'glow' ? 'none' : `
                    3px 3px 6px rgba(0,0,0,0.9),
                    -1px -1px 2px rgba(0,0,0,0.5),
                    1px -1px 2px rgba(0,0,0,0.5),
                    -1px 1px 2px rgba(0,0,0,0.5),
                    1px 1px 2px rgba(0,0,0,0.5)
                  `, // 더 강한 그림자 (gradient와 glow 제외)
                  textAlign,
                  margin: 0,
                  lineHeight: 1.2,
                  display: ['spin', 'pulse', 'bounce', 'zoom', 'wave', 'typing'].includes(text.effect || '') ? 'inline-block' : 'block',
                  transformOrigin: 'center',
                  // 텍스트 효과 추가
                  ...(text.effect === 'none' && {}),
                  ...(text.effect === 'fade' && {
                    animation: 'fadeInOut 2s ease-in-out infinite'
                  }),
                  ...(text.effect === 'slide' && {
                    animation: 'slideIn 1s ease-out'
                  }),
                  ...(text.effect === 'glow' && {
                    textShadow: '0 0 20px rgba(255,255,255,0.9), 0 0 40px rgba(56,244,124,0.7)',
                    animation: 'glow 2s ease-in-out infinite'
                  }),
                  ...(text.effect === 'pulse' && {
                    animation: 'pulse 1.5s ease-in-out infinite'
                  }),
                  ...(text.effect === 'bounce' && {
                    animation: 'bounce 1.5s ease-in-out infinite'
                  }),
                  ...(text.effect === 'gradient' && {
                    background: 'linear-gradient(90deg, #38f47c, #3b82f6, #a855f7, #ec4899, #38f47c)',
                    backgroundSize: '200% auto',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    animation: 'gradientMove 3s linear infinite'
                  }),
                  ...(text.effect === 'spin' && {
                    animation: 'spin 3s linear infinite'
                  }),
                  ...(text.effect === 'shake' && {
                    animation: 'shake 0.3s ease-in-out infinite'
                  }),
                  ...(text.effect === 'typing' && {
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    width: '100%',
                    animation: 'typing 4s steps(40, end) infinite',
                    borderRight: '3px solid rgba(255,255,255,0.7)'
                  }),
                  ...(text.effect === 'wave' && {
                    animation: 'wave 2s ease-in-out infinite'
                  }),
                  ...(text.effect === 'zoom' && {
                    animation: 'zoom 2s ease-in-out infinite'
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
        
        // 비디오와 동일한 트리밍 적용
        const startFrom = sound.startTime ? Math.round(sound.startTime * 30) : 0;
        const endAt = sound.endTime ? Math.round(sound.endTime * 30) : undefined;
        
        return (
          <Sequence
            key={sound.id}
            from={audioFrom}
            durationInFrames={audioDuration}
          >
            <Audio 
              src={sound.url} 
              volume={(sound.volume || 100) / 100}
              startFrom={startFrom}
              endAt={endAt}
            />
          </Sequence>
        );
      })}
      
      {/* CSS 애니메이션 정의 */}
      <style>{`
        @keyframes fadeInOut {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        
        @keyframes slideIn {
          0% { 
            transform: translateX(-100%); 
            opacity: 0; 
          }
          60% { 
            transform: translateX(10px); 
            opacity: 1; 
          }
          100% { 
            transform: translateX(0); 
            opacity: 1; 
          }
        }
        
        @keyframes glow {
          0%, 100% { 
            text-shadow: 0 0 20px rgba(255,255,255,0.7), 0 0 40px rgba(56,244,124,0.5);
          }
          50% { 
            text-shadow: 0 0 30px rgba(255,255,255,0.9), 0 0 60px rgba(56,244,124,0.8);
          }
        }
        
        @keyframes pulse {
          0%, 100% { 
            transform: scale(1); 
            opacity: 1; 
          }
          50% { 
            transform: scale(1.08); 
            opacity: 0.9; 
          }
        }
        
        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% { 
            transform: translateY(0); 
          }
          40% { 
            transform: translateY(-30px); 
          }
          60% { 
            transform: translateY(-15px); 
          }
        }
        
        @keyframes gradientMove {
          0% { background-position: 0% center; }
          100% { background-position: 200% center; }
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-3px); }
          20%, 40%, 60%, 80% { transform: translateX(3px); }
        }
        
        @keyframes typing {
          0%, 10% { 
            width: 0;
            border-right-color: transparent;
          }
          10.1%, 90% { 
            border-right-color: rgba(255,255,255,0.7);
          }
          90%, 100% { 
            width: 100%;
            border-right-color: transparent;
          }
        }
        
        @keyframes wave {
          0%, 100% { 
            transform: translateY(0) rotate(0deg); 
          }
          25% { 
            transform: translateY(-5px) rotate(-2deg); 
          }
          50% { 
            transform: translateY(0) rotate(0deg); 
          }
          75% { 
            transform: translateY(-5px) rotate(2deg); 
          }
        }
        
        @keyframes zoom {
          0%, 100% { 
            transform: scale(1); 
          }
          25% { 
            transform: scale(1.1); 
          }
          50% { 
            transform: scale(1.3); 
          }
          75% { 
            transform: scale(1.1); 
          }
        }
      `}</style>
    </AbsoluteFill>
  );
};