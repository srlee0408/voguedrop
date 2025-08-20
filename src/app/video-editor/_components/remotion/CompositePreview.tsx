import React from 'react';
import { AbsoluteFill, Sequence, OffthreadVideo, Audio, useVideoConfig, useCurrentFrame } from 'remotion';
import { TextClip as TextClipType, SoundClip as SoundClipType } from '@/types/video-editor';
import { TEXT_DEFAULTS, TEXT_PADDING, TEXT_POSITION_PRESETS, TEXT_ANIMATION, pxToFrames, ratioToPixels, pixelsToRatio } from '../../../../constants/text-editor';

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
  backgroundColor?: string;
}

// Audio component with fade in/out support
const AudioWithFade: React.FC<{
  src: string;
  baseVolume: number;
  fadeInFrames: number;
  fadeOutFrames: number;
  totalFrames: number;
  startFrom?: number;
  endAt?: number;
  fadeInType?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
  fadeOutType?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
}> = ({ 
  src, 
  baseVolume, 
  fadeInFrames, 
  fadeOutFrames, 
  totalFrames, 
  startFrom, 
  endAt,
  fadeInType = 'linear',
  fadeOutType = 'linear'
}) => {
  const frame = useCurrentFrame();
  
  // Calculate fade volume
  let fadeMultiplier = 1;
  
  // Apply fade in with more dramatic curve
  if (fadeInFrames > 0 && frame < fadeInFrames) {
    const fadeInProgress = frame / fadeInFrames;
    
    switch (fadeInType) {
      case 'ease-in':
        // More dramatic cubic curve for slower start
        fadeMultiplier = fadeInProgress * fadeInProgress * fadeInProgress;
        break;
      case 'ease-out':
        // Fast rise, then slow down (more dramatic)
        fadeMultiplier = 1 - Math.pow(1 - fadeInProgress, 3);
        break;
      case 'ease-in-out':
        // S-curve with more dramatic acceleration/deceleration
        fadeMultiplier = fadeInProgress < 0.5
          ? 4 * fadeInProgress * fadeInProgress * fadeInProgress
          : 1 - Math.pow(-2 * fadeInProgress + 2, 3) / 2;
        break;
      case 'linear':
      default:
        fadeMultiplier = fadeInProgress;
        break;
    }
  }
  
  // Apply fade out with more dramatic curve
  const fadeOutStart = totalFrames - fadeOutFrames;
  if (fadeOutFrames > 0 && frame >= fadeOutStart) {
    const fadeOutProgress = (totalFrames - frame) / fadeOutFrames;
    
    switch (fadeOutType) {
      case 'ease-in':
        // More dramatic cubic curve for gradual then fast drop
        fadeMultiplier = Math.pow(fadeOutProgress, 3);
        break;
      case 'ease-out':
        // Fast drop then slow (more dramatic)
        fadeMultiplier = 1 - Math.pow(1 - fadeOutProgress, 3);
        break;
      case 'ease-in-out':
        // S-curve with more dramatic acceleration/deceleration
        fadeMultiplier = fadeOutProgress < 0.5
          ? 4 * fadeOutProgress * fadeOutProgress * fadeOutProgress
          : 1 - Math.pow(-2 * fadeOutProgress + 2, 3) / 2;
        break;
      case 'linear':
      default:
        fadeMultiplier = fadeOutProgress;
        break;
    }
  }
  
  const finalVolume = baseVolume * fadeMultiplier;
  
  return (
    <Audio 
      src={src} 
      volume={finalVolume}
      startFrom={startFrom}
      endAt={endAt}
    />
  );
};

export const CompositePreview: React.FC<CompositePreviewProps> = ({ 
  videoClips, 
  textClips, 
  soundClips,
  backgroundColor = 'black'
}) => {
  const { width, height } = useVideoConfig();
  // Lambda 환경에서는 폰트가 이미 index.ts에서 로드됨
  // 브라우저 전용 document.fonts.load() 제거
  
  // 비율 계산
  const aspectRatio = width / height;
  const is16by9 = Math.abs(aspectRatio - 16/9) < 0.01;
  const is9by16 = Math.abs(aspectRatio - 9/16) < 0.01;
  const is1by1 = Math.abs(aspectRatio - 1) < 0.01;
  
  // 비디오 클립들을 position 기반으로 배치
  const videoSequences = videoClips
    .filter(clip => clip.url) // URL이 있는 클립만 처리
    .map(clip => {
      // 시작/종료 시간을 프레임으로 변환
      const startFrom = clip.startTime ? Math.round(clip.startTime * 30) : 0;
      
      return {
        id: clip.id,
        url: clip.url!,
        title: clip.title,
        from: pxToFrames(clip.position || 0), // position 값을 사용하여 시작 위치 결정
        durationInFrames: pxToFrames(clip.duration),
        startFrom,
        endAt: clip.endTime ? Math.round(clip.endTime * 30) : undefined
      };
    });
  
  return (
    <AbsoluteFill style={{ backgroundColor }}>
      {/* Letterbox 효과 - 모든 비율에 적용 */}
      {(is16by9 || is9by16 || is1by1) && (
        <>
          {/* 16:9 - 상하 letterbox */}
          {is16by9 && (
            <>
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '10%',
                  background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), rgba(0,0,0,0))',
                  pointerEvents: 'none',
                  zIndex: 5,
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: '10%',
                  background: 'linear-gradient(to top, rgba(0,0,0,0.8), rgba(0,0,0,0))',
                  pointerEvents: 'none',
                  zIndex: 5,
                }}
              />
            </>
          )}
          
          {/* 9:16 - 좌우 letterbox */}
          {is9by16 && (
            <>
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  bottom: 0,
                  width: '10%',
                  background: 'linear-gradient(to right, rgba(0,0,0,0.8), rgba(0,0,0,0))',
                  pointerEvents: 'none',
                  zIndex: 5,
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  bottom: 0,
                  width: '10%',
                  background: 'linear-gradient(to left, rgba(0,0,0,0.8), rgba(0,0,0,0))',
                  pointerEvents: 'none',
                  zIndex: 5,
                }}
              />
            </>
          )}
          
          {/* 1:1 - 네 방향 모두 letterbox */}
          {is1by1 && (
            <>
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '8%',
                  background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), rgba(0,0,0,0))',
                  pointerEvents: 'none',
                  zIndex: 5,
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: '8%',
                  background: 'linear-gradient(to top, rgba(0,0,0,0.8), rgba(0,0,0,0))',
                  pointerEvents: 'none',
                  zIndex: 5,
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  bottom: 0,
                  width: '8%',
                  background: 'linear-gradient(to right, rgba(0,0,0,0.8), rgba(0,0,0,0))',
                  pointerEvents: 'none',
                  zIndex: 5,
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  bottom: 0,
                  width: '8%',
                  background: 'linear-gradient(to left, rgba(0,0,0,0.8), rgba(0,0,0,0))',
                  pointerEvents: 'none',
                  zIndex: 5,
                }}
              />
            </>
          )}
        </>
      )}
      
      {/* 1. 비디오 레이어 - 순차 재생 */}
      {videoSequences.map(video => (
        <Sequence
          key={video.id}
          from={video.from}
          durationInFrames={video.durationInFrames}
          premountFor={Infinity} // 모든 비디오를 미리 마운트하여 끊김 없는 재생
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
              objectFit: 'contain'
            }}
          />
        </Sequence>
      ))}
      
      {/* 2. 텍스트 오버레이 레이어 */}
      <AbsoluteFill style={{ pointerEvents: 'none', zIndex: 10 }}>
        {textClips.map(text => {
          const textFrom = pxToFrames(text.position || 0);
          const textDuration = pxToFrames(text.duration);
          
          // 텍스트 위치 계산 - 일관된 계산 방식 적용
          const getTextPosition = () => {
            const style = text.style;
            let top = '50%';
            let left = '50%';
            let transform = 'translate(-50%, -50%)';
            
            // positionX와 positionY가 있으면 우선 사용 (드래그로 설정한 커스텀 위치)
            if (style?.positionX !== undefined && style?.positionY !== undefined) {
              // 퍼센트 값 그대로 사용 (TextOverlayEditor와 동일)
              left = `${style.positionX}%`;
              top = `${style.positionY}%`;
              // 항상 중앙 기준으로 변환
              transform = 'translate(-50%, -50%)';
            } else {
              // 프리셋 위치 사용
              // 수직 위치
              const verticalPreset = style?.verticalPosition || 'middle';
              top = `${TEXT_POSITION_PRESETS.vertical[verticalPreset]}%`;
              
              // 수평 위치와 transform 조정
              const horizontalPreset = style?.alignment || 'center';
              left = `${TEXT_POSITION_PRESETS.horizontal[horizontalPreset]}%`;
              
              if (horizontalPreset === 'left') {
                transform = 'translateY(-50%)'; // Y축만 중앙 정렬
              } else if (horizontalPreset === 'right') {
                transform = 'translate(-100%, -50%)'; // 우측 정렬
              } else {
                transform = 'translate(-50%, -50%)'; // 완전 중앙 정렬
              }
            }
            
            return { top, left, transform };
          };
          
          const position = getTextPosition();
          const textAlign: 'left' | 'center' | 'right' = text.style?.alignment || 'center';
          
          // 상대적 크기 계산
          const actualFontSize = (() => {
            // fontSizeRatio가 있으면 우선 사용
            if (text.style?.fontSizeRatio !== undefined) {
              return ratioToPixels(text.style.fontSizeRatio, width);
            }
            // 기존 fontSize를 비율로 변환 (1080px 기준)
            const baseWidth = 1080;
            const ratio = pixelsToRatio(text.style?.fontSize || TEXT_DEFAULTS.fontSize, baseWidth);
            return ratioToPixels(ratio, width);
          })();
          
          // 상대적 패딩 계산
          const hasBackground = !!text.style?.backgroundColor;
          const paddingH = hasBackground ? ratioToPixels(TEXT_PADDING.horizontalRatio, width) : 0;
          const paddingV = hasBackground ? ratioToPixels(TEXT_PADDING.verticalRatio, height) : 0;
          
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
                  // 텍스트 박스 크기를 적절히 제한
                  maxWidth: `${TEXT_DEFAULTS.maxWidthRatio * 100}%`,
                  padding: hasBackground ? `${paddingV}px ${paddingH}px` : '0',
                  backgroundColor: text.style?.backgroundColor || 'transparent',
                  opacity: text.style?.backgroundOpacity ?? 1,
                  borderRadius: `${TEXT_ANIMATION.borderRadius}px`
                }}
              >
                <h1 style={{
                  fontSize: actualFontSize, // 상대적 크기 사용
                  color: text.effect === 'gradient' ? 'transparent' : (text.style?.color || TEXT_DEFAULTS.color),
                  fontFamily: (() => {
                    const baseFont = text.style?.fontFamily || TEXT_DEFAULTS.fontFamily;
                    if (baseFont === 'default') return 'sans-serif';
                    // Script/Cursive 폰트들
                    if (['Dancing Script', 'Pacifico', 'Lobster'].includes(baseFont)) {
                      return `"${baseFont}", cursive, sans-serif`;
                    }
                    // Serif 폰트들
                    if (['Playfair Display', 'Merriweather'].includes(baseFont)) {
                      return `"${baseFont}", serif, sans-serif`;
                    }
                    // Display 폰트들
                    if (['Bebas Neue', 'Oswald'].includes(baseFont)) {
                      return `"${baseFont}", Impact, sans-serif`;
                    }
                    // Sans-serif 폰트들 (기본)
                    return `"${baseFont}", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
                  })(),
                  fontWeight: text.style?.fontWeight || TEXT_DEFAULTS.fontWeight,
                  textShadow: text.effect === 'gradient' || text.effect === 'glow' ? 'none' : `
                    3px 3px 6px rgba(0,0,0,0.9),
                    -1px -1px 2px rgba(0,0,0,0.5),
                    1px -1px 2px rgba(0,0,0,0.5),
                    -1px 1px 2px rgba(0,0,0,0.5),
                    1px 1px 2px rgba(0,0,0,0.5)
                  `, // 더 강한 그림자 (gradient와 glow 제외)
                  textAlign,
                  margin: 0,
                  padding: 0,
                  lineHeight: TEXT_ANIMATION.lineHeight,
                  display: ['spin', 'pulse', 'bounce', 'zoom', 'wave', 'typing'].includes(text.effect || '') ? 'inline-block' : 'block',
                  transformOrigin: 'center',
                  // typing 효과일 때만 whiteSpace 적용
                  whiteSpace: text.effect === 'typing' ? 'nowrap' : 'normal',
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
        if (!sound.url) {
          return null;
        }
        
        // URL 유효성 체크
        try {
          // data URL이거나 http(s) URL인지 확인
          if (!sound.url.startsWith('data:') && !sound.url.startsWith('http')) {
            return null;
          }
        } catch {
          return null;
        }
        
        const audioFrom = pxToFrames(sound.position || 0);
        const audioDuration = pxToFrames(sound.duration);
        
        // 비디오와 동일한 트리밍 적용
        const startFrom = sound.startTime ? Math.round(sound.startTime * 30) : 0;
        const endAt = sound.endTime ? Math.round(sound.endTime * 30) : undefined;
        
        // Calculate volume (0-100% range, linear mapping)
        const volumeValue = sound.volume !== undefined ? sound.volume : 100;
        const normalizedVolume = volumeValue / 100; // 0% = 0, 100% = 1
        
        // Calculate fade frames
        const fadeInFrames = sound.fadeInDuration ? pxToFrames(sound.fadeInDuration) : 0;
        const fadeOutFrames = sound.fadeOutDuration ? pxToFrames(sound.fadeOutDuration) : 0;
        
        return (
          <Sequence
            key={`${sound.id}-${sound.url}`} // Key based on id and url only, not volume
            from={audioFrom}
            durationInFrames={audioDuration}
          >
            <AudioWithFade
              src={sound.url}
              baseVolume={normalizedVolume}
              fadeInFrames={fadeInFrames}
              fadeOutFrames={fadeOutFrames}
              totalFrames={audioDuration}
              startFrom={startFrom}
              endAt={endAt}
              fadeInType={sound.fadeInType || 'linear'}
              fadeOutType={sound.fadeOutType || 'linear'}
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