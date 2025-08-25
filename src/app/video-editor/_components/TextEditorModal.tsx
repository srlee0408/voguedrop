'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { TextClip, TextStyle, TextEffect } from '@/shared/types/video-editor';
import { TEXT_DEFAULTS, FONT_SIZE_PRESETS, pixelsToRatio } from '@/shared/constants/text-editor';
import { FONT_FAMILIES } from '@/shared/constants/fonts';

interface TextEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddText: (text: Partial<TextClip>) => void;
  editingClip?: TextClip;
  targetLaneIndex?: number | null; // 레인 인덱스 추가
}

// constants/fonts의 FONT_FAMILIES 사용
const fontFamilies = FONT_FAMILIES;

const presetColors = [
  '#000000',
  '#FFFFFF',
  '#38f47cf9',
  '#3b82f6',
  '#a855f7',
  '#ec4899',
  '#f97316',
  '#eab308',
  '#22c55e',
];

const textEffects: { value: TextEffect; label: string; className?: string }[] = [
  { value: 'none', label: 'None' },
  // Original effects
  { value: 'pulse', label: 'Pulse', className: 'text-pulse' },
  { value: 'bounce', label: 'Bounce', className: 'text-bounce' },
  { value: 'gradient', label: 'Gradient', className: 'text-gradient' },
  { value: 'spin', label: 'Spin', className: 'text-spin' },
  { value: 'shake', label: 'Shake', className: 'text-shake' },
  { value: 'slide', label: 'Slide', className: 'text-slide' },
  { value: 'fade', label: 'Fade', className: 'text-fade' },
  { value: 'typing', label: 'Typing', className: 'text-typing' },
  { value: 'glow', label: 'Glow', className: 'text-glow' },
  { value: 'wave', label: 'Wave', className: 'text-wave' },
  { value: 'zoom', label: 'Zoom', className: 'text-zoom' },
  // New 3D effects
  { value: 'flip', label: 'Flip', className: 'text-flip' },
  // Elastic effects
  { value: 'elastic', label: 'Elastic', className: 'text-elastic' },
  { value: 'rubberband', label: 'Rubberband', className: 'text-rubberband' },
  { value: 'jello', label: 'Jello', className: 'text-jello' },
  // Digital effects
  { value: 'flash', label: 'Flash', className: 'text-flash' },
  { value: 'glitch', label: 'Glitch', className: 'text-glitch' },
  // Style effects
  { value: 'neon', label: 'Neon', className: 'text-neon' },
  { value: 'shadow', label: 'Shadow', className: 'text-shadow' },
  { value: 'outline', label: 'Outline', className: 'text-outline' },
  { value: 'chrome', label: 'Chrome', className: 'text-chrome' },
  { value: 'rainbow', label: 'Rainbow', className: 'text-rainbow' },
  { value: 'fire', label: 'Fire', className: 'text-fire' },
  { value: 'ice', label: 'Ice', className: 'text-ice' },
];

export default function TextEditorModal({
  isOpen,
  onClose,
  onAddText,
  editingClip,
  targetLaneIndex, // 레인 인덱스 추가
}: TextEditorModalProps) {
  const [content, setContent] = useState(editingClip?.content || '');
  const [style, setStyle] = useState<TextStyle>(
    editingClip?.style || {
      fontSize: TEXT_DEFAULTS.fontSize, // 호환성을 위해 유지
      fontSizeRatio: TEXT_DEFAULTS.fontSizeRatio, // 비율 추가
      fontFamily: 'default',
      color: '#FFFFFF',
      alignment: 'center',
      fontWeight: 700, // 숫자로 통일 (bold = 700)
      verticalPosition: 'middle',
      backgroundColor: '',
      backgroundOpacity: 0.7,
    }
  );
  const [selectedEffect, setSelectedEffect] = useState<TextEffect>(
    editingClip?.effect || 'none'
  );

  // 폰트 로딩 상태 확인 (디버깅용, 실제로는 CSS가 자동 로드)
  useEffect(() => {
    if (typeof window !== 'undefined' && isOpen) {
      // fonts.ready promise를 통한 로딩 완료 확인
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => {
          // 폰트가 모두 로드된 후 체크
          const fontFamilies = FONT_FAMILIES.filter(f => f.value !== 'default' && !f.value.includes('Arial') && !f.value.includes('Helvetica') && !f.value.includes('Times') && !f.value.includes('Georgia') && !f.value.includes('Courier'));
          
          let loadedCount = 0;
          let notLoadedCount = 0;
          
          fontFamilies.forEach(font => {
            if (document.fonts && document.fonts.check) {
              // 다양한 weight로 체크
              const loaded400 = document.fonts.check(`400 16px "${font.value}"`);
              const loaded700 = document.fonts.check(`700 16px "${font.value}"`);
              const loadedNormal = document.fonts.check(`16px "${font.value}"`);
              
              if (loaded400 || loaded700 || loadedNormal) {
                loadedCount++;
              } else {
                notLoadedCount++;
                console.warn(`Font not available: ${font.value}`);
              }
            }
          });
          
          console.log(`Fonts status - Loaded: ${loadedCount}, Not loaded: ${notLoadedCount}`);
        });
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (content.trim()) {
      const clipData: Partial<TextClip> = {
        content,
        style,
        effect: selectedEffect,
      };
      
      // 새로 추가할 때만 duration과 position 설정
      if (!editingClip) {
        clipData.duration = 200;
        // 레인 인덱스 설정
        if (targetLaneIndex !== null && targetLaneIndex !== undefined) {
          clipData.laneIndex = targetLaneIndex;
        }
      }
      
      onAddText(clipData);
      onClose();
      setContent('');
      setSelectedEffect('none');
    }
  };

  const getEffectStyle = (effect: TextEffect): React.CSSProperties => {
    switch (effect) {
      case 'gradient':
        return {
          backgroundImage: 'linear-gradient(90deg, #38f47c, #3b82f6, #a855f7, #ec4899, #38f47c)',
          backgroundSize: '200% auto',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        } as React.CSSProperties;
      case 'glow':
        return {
          textShadow: '0 0 20px rgba(255,255,255,0.9), 0 0 40px rgba(56,244,124,0.7)',
        };
      case 'neon':
        return {
          textShadow: '0 0 10px currentColor, 0 0 20px currentColor, 0 0 30px currentColor, 0 0 40px currentColor',
        };
      case 'shadow':
        return {
          textShadow: '3px 3px 6px rgba(0,0,0,0.5)',
        };
      case 'outline':
        return {
          WebkitTextStroke: '2px currentColor',
          WebkitTextFillColor: 'transparent',
        } as React.CSSProperties;
      case 'chrome':
        return {
          backgroundImage: 'linear-gradient(to bottom, #eee 0%, #999 50%, #777 51%, #555 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.5))',
        } as React.CSSProperties;
      case 'rainbow':
        return {
          backgroundImage: 'linear-gradient(90deg, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #9400d3)',
          backgroundSize: '200% auto',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        } as React.CSSProperties;
      case 'fire':
        return {
          backgroundImage: 'linear-gradient(45deg, #ff0000, #ff4500, #ff8c00, #ffd700)',
          backgroundSize: '200% 200%',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          filter: 'drop-shadow(0 0 3px #ff4500)',
        } as React.CSSProperties;
      case 'ice':
        return {
          backgroundImage: 'linear-gradient(45deg, #00ffff, #00bfff, #1e90ff, #4169e1)',
          backgroundSize: '200% 200%',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          filter: 'drop-shadow(0 0 3px #00bfff)',
        } as React.CSSProperties;
      case 'typing':
        return {
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          borderRight: '3px solid rgba(255,255,255,0.7)',
          display: 'inline-block',
          width: 'fit-content',
        };
      case 'glitch':
        return {
          position: 'relative' as const,
          display: 'inline-block',
        };
      case 'flip':
        return {
          display: 'inline-block',
          transformStyle: 'preserve-3d' as const,
          perspective: '1000px',
        };
      case 'pulse':
      case 'bounce':
      case 'spin':
      case 'wave':
      case 'zoom':
      case 'elastic':
      case 'rubberband':
      case 'jello':
      case 'flash':
        return {
          display: 'inline-block',
          transformOrigin: 'center',
        };
      default:
        return {};
    }
  };

  const getEffectClass = (effect: TextEffect) => {
    const effectItem = textEffects.find((e) => e.value === effect);
    return effectItem?.className || '';
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-gray-800 rounded-lg w-[1000px] max-w-[90vw] h-[700px] max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-medium text-white">Text Editor</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center hover:bg-gray-700 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Main Content - 2 Column Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Editor (60%) */}
          <div className="w-3/5 p-6 space-y-4 overflow-y-auto border-r border-gray-700">
            {/* Text Content */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">
                Text Content
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full h-20 bg-gray-900 rounded-lg p-3 text-sm text-white resize-none focus:ring-2 focus:ring-[#38f47cf9] focus:outline-none"
                placeholder="Enter your text..."
              />
            </div>

            {/* Font Style & Size - One Row */}
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-2 text-gray-300">
                  Font Style
                </label>
                <select
                  value={style.fontFamily}
                  onChange={(e) => setStyle({ ...style, fontFamily: e.target.value })}
                  className="w-full bg-gray-900 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-[#38f47cf9] focus:outline-none"
                >
                  {fontFamilies.map((font) => (
                    <option key={font.value} value={font.value}>
                      {font.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">
                  Font Size
                </label>
                <div className="flex flex-col gap-2">
                  {/* 크기 프리셋 버튼들 */}
                  <div className="flex gap-1">
                    {Object.entries(FONT_SIZE_PRESETS).map(([key, preset]) => {
                      const isActive = Math.abs((style.fontSizeRatio || TEXT_DEFAULTS.fontSizeRatio) - preset.ratio) < 0.005;
                      return (
                        <button
                          key={key}
                          onClick={() => {
                            const baseFontSize = Math.round(preset.ratio * 1080);
                            setStyle({ 
                              ...style, 
                              fontSize: baseFontSize,
                              fontSizeRatio: preset.ratio 
                            });
                          }}
                          className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
                            isActive 
                              ? 'bg-[#38f47cf9] text-black font-medium' 
                              : 'bg-gray-900 text-gray-300 hover:bg-gray-700'
                          }`}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>
                  {/* 미세 조정 슬라이더 */}
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="0.02"
                      max="0.12"
                      step="0.002"
                      value={style.fontSizeRatio || pixelsToRatio(style.fontSize, 1080)}
                      onChange={(e) => {
                        const ratio = parseFloat(e.target.value);
                        const baseFontSize = Math.round(ratio * 1080);
                        setStyle({ 
                          ...style, 
                          fontSize: baseFontSize,
                          fontSizeRatio: ratio 
                        });
                      }}
                      className="flex-1"
                    />
                    <span className="text-xs text-gray-400 w-12 text-right">
                      {Math.round((style.fontSizeRatio || pixelsToRatio(style.fontSize, 1080)) * 1080)}px
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Text Color */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">
                Text Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={style.color}
                  onChange={(e) => setStyle({ ...style, color: e.target.value })}
                  className="w-10 h-10 rounded cursor-pointer bg-transparent"
                />
                <div className="flex gap-2 flex-wrap">
                  {presetColors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setStyle({ ...style, color })}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        style.color === color ? 'border-[#38f47cf9] scale-110' : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Text Effects */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">
                Text Effects
              </label>
              <div className="grid grid-cols-4 gap-2">
                {textEffects.map((effect) => (
                  <button
                    key={effect.value}
                    onClick={() => setSelectedEffect(effect.value)}
                    className={`px-2 py-1.5 bg-gray-900 rounded text-xs hover:bg-gray-700 transition-colors ${
                      selectedEffect === effect.value
                        ? 'ring-2 ring-[#38f47cf9] bg-gray-700'
                        : ''
                    }`}
                  >
                    {effect.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Text Alignment */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">
                Text Alignment
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setStyle({ ...style, alignment: 'left' })}
                  className={`flex-1 px-3 py-2 bg-gray-900 rounded text-sm hover:bg-gray-700 transition-colors ${
                    style.alignment === 'left' ? 'bg-gray-700 ring-2 ring-[#38f47cf9]' : ''
                  }`}
                >
                  <i className="ri-align-left text-white"></i>
                </button>
                <button
                  onClick={() => setStyle({ ...style, alignment: 'center' })}
                  className={`flex-1 px-3 py-2 bg-gray-900 rounded text-sm hover:bg-gray-700 transition-colors ${
                    style.alignment === 'center' ? 'bg-gray-700 ring-2 ring-[#38f47cf9]' : ''
                  }`}
                >
                  <i className="ri-align-center text-white"></i>
                </button>
                <button
                  onClick={() => setStyle({ ...style, alignment: 'right' })}
                  className={`flex-1 px-3 py-2 bg-gray-900 rounded text-sm hover:bg-gray-700 transition-colors ${
                    style.alignment === 'right' ? 'bg-gray-700 ring-2 ring-[#38f47cf9]' : ''
                  }`}
                >
                  <i className="ri-align-right text-white"></i>
                </button>
              </div>
            </div>
          </div>

          {/* Right Panel - Preview (40%) */}
          <div className="w-2/5 p-6 bg-gray-900/50">
            <div className="h-full flex flex-col">
              <div className="mb-3">
                <label className="text-sm font-medium text-gray-300">
                  Live Preview
                </label>
              </div>
              <div className="flex-1 rounded-lg p-6 flex items-center relative overflow-hidden bg-gray-500">
                {/* Checkerboard Pattern */}
                <div className="absolute inset-0">
                  <div className="h-full w-full" style={{
                    backgroundImage: 'linear-gradient(45deg, #606060 25%, transparent 25%), linear-gradient(-45deg, #606060 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #606060 75%), linear-gradient(-45deg, transparent 75%, #606060 75%)',
                    backgroundSize: '20px 20px',
                    backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                    backgroundColor: '#505050'
                  }} />
                </div>
                
                {/* Grid overlay for better visibility */}
                <div className="absolute inset-0 opacity-5 pointer-events-none">
                  <div className="h-full w-full" style={{
                    backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
                    backgroundSize: '20px 20px'
                  }} />
                </div>
                
                {/* Preview Content */}
                <div className={`w-full flex items-center relative z-10 ${
                  style.alignment === 'left' ? 'justify-start' : 
                  style.alignment === 'right' ? 'justify-end' : 
                  'justify-center'
                }`}>
                  <div
                    className={`${getEffectClass(selectedEffect)} ${selectedEffect === 'typing' ? '' : 'w-full'}`}
                    style={{
                      fontSize: `${style.fontSize}px`,
                      fontFamily: style.fontFamily === 'default' ? 'sans-serif' : `"${style.fontFamily}", sans-serif`,
                      color: selectedEffect === 'gradient' || selectedEffect === 'rainbow' || selectedEffect === 'chrome' || selectedEffect === 'fire' || selectedEffect === 'ice' ? 'transparent' : style.color,
                      textAlign: style.alignment,
                      fontWeight: style.fontWeight,
                      ...getEffectStyle(selectedEffect),
                    }}
                  >
                    {content || 'Your text will appear here'}
                  </div>
                </div>
              </div>
              
              {/* Effect Info */}
              <div className="mt-4 p-3 bg-gray-800 rounded-lg">
                <div className="text-xs text-gray-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Effect:</span>
                    <span className="text-white">{selectedEffect === 'none' ? 'None' : textEffects.find(e => e.value === selectedEffect)?.label}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Size:</span>
                    <span className="text-white">{style.fontSize}px</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Alignment:</span>
                    <span className="text-white capitalize">{style.alignment}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700">
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 rounded-lg text-sm hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-[#38f47cf9] rounded-lg text-black text-sm font-medium hover:bg-[#38f47cf9]/80 transition-colors"
            >
              Add to Timeline
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
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
        
        @keyframes gradient {
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
        
        @keyframes slide {
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
        
        @keyframes fade {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
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
        
        @keyframes glow {
          0%, 100% { 
            text-shadow: 0 0 20px rgba(255,255,255,0.7), 0 0 40px rgba(56,244,124,0.5);
          }
          50% { 
            text-shadow: 0 0 30px rgba(255,255,255,0.9), 0 0 60px rgba(56,244,124,0.8);
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
        
        @keyframes flip {
          0% { transform: rotateY(0); }
          50% { transform: rotateY(180deg); }
          100% { transform: rotateY(360deg); }
        }
        
        @keyframes elastic {
          0%, 100% { transform: scale(1); }
          30% { transform: scale(1.25); }
          40% { transform: scale(0.75); }
          50% { transform: scale(1.15); }
          65% { transform: scale(0.95); }
          75% { transform: scale(1.05); }
        }
        
        @keyframes rubberband {
          0% { transform: scale(1); }
          30% { transform: scaleX(1.25) scaleY(0.75); }
          40% { transform: scaleX(0.75) scaleY(1.25); }
          60% { transform: scaleX(1.15) scaleY(0.85); }
          100% { transform: scale(1); }
        }
        
        @keyframes jello {
          0%, 100% { transform: skewX(0deg) skewY(0deg); }
          30% { transform: skewX(-12.5deg) skewY(-12.5deg); }
          40% { transform: skewX(6.25deg) skewY(6.25deg); }
          50% { transform: skewX(-3.125deg) skewY(-3.125deg); }
          65% { transform: skewX(1.5625deg) skewY(1.5625deg); }
        }
        
        @keyframes flash {
          0%, 50%, 100% { opacity: 1; }
          25%, 75% { opacity: 0; }
        }
        
        @keyframes glitch {
          0%, 100% { 
            text-shadow: 2px 0 #ff00ff, -2px 0 #00ffff;
            transform: translate(0);
          }
          20% {
            text-shadow: 2px 0 #ff00ff, -2px 0 #00ffff;
            transform: translate(-2px, 2px);
          }
          40% {
            text-shadow: -2px 0 #ff00ff, 2px 0 #00ffff;
            transform: translate(-2px, -2px);
          }
          60% {
            text-shadow: 2px 0 #ff00ff, -2px 0 #00ffff;
            transform: translate(2px, 2px);
          }
          80% {
            text-shadow: -2px 0 #ff00ff, 2px 0 #00ffff;
            transform: translate(2px, -2px);
          }
        }
        
        @keyframes neon {
          0%, 100% {
            text-shadow: 
              0 0 10px currentColor,
              0 0 20px currentColor,
              0 0 30px currentColor,
              0 0 40px currentColor;
          }
          50% {
            text-shadow: 
              0 0 5px currentColor,
              0 0 10px currentColor,
              0 0 15px currentColor,
              0 0 20px currentColor;
          }
        }
        
        @keyframes rainbow {
          0% { background-position: 0% center; }
          100% { background-position: 200% center; }
        }
        
        @keyframes fire {
          0%, 100% { 
            background-position: 0% 50%;
            filter: drop-shadow(0 0 3px #ff4500) brightness(1);
          }
          50% { 
            background-position: 100% 50%;
            filter: drop-shadow(0 0 8px #ff6347) brightness(1.1);
          }
        }
        
        @keyframes ice {
          0%, 100% { 
            background-position: 0% 50%;
            filter: drop-shadow(0 0 3px #00bfff) brightness(1);
          }
          50% { 
            background-position: 100% 50%;
            filter: drop-shadow(0 0 8px #87ceeb) brightness(1.1);
          }
        }

        .text-pulse {
          animation: pulse 1.5s ease-in-out infinite;
        }
        .text-bounce {
          animation: bounce 1.5s ease-in-out infinite;
        }
        .text-gradient {
          animation: gradient 3s linear infinite;
        }
        .text-spin {
          animation: spin 3s linear infinite;
        }
        .text-shake {
          animation: shake 0.3s ease-in-out infinite;
        }
        .text-slide {
          animation: slide 2s ease-in-out infinite;
        }
        .text-fade {
          animation: fade 2s ease-in-out infinite;
        }
        .text-typing {
          animation: typing 4s steps(40, end) infinite;
        }
        .text-glow {
          animation: glow 2s ease-in-out infinite;
        }
        .text-wave {
          animation: wave 2s ease-in-out infinite;
        }
        .text-zoom {
          animation: zoom 2s ease-in-out infinite;
        }
        .text-flip {
          animation: flip 3s ease-in-out infinite;
        }
        .text-elastic {
          animation: elastic 1.5s ease-in-out infinite;
        }
        .text-rubberband {
          animation: rubberband 1s ease-in-out infinite;
        }
        .text-jello {
          animation: jello 1s ease-in-out infinite;
        }
        .text-flash {
          animation: flash 1s ease-in-out infinite;
        }
        .text-glitch {
          animation: glitch 1s ease-in-out infinite;
        }
        .text-neon {
          animation: neon 1.5s ease-in-out infinite;
        }
        .text-shadow {
          text-shadow: 3px 3px 6px rgba(0,0,0,0.5);
        }
        .text-outline {
          -webkit-text-stroke: 2px currentColor;
          -webkit-text-fill-color: transparent;
        }
        .text-chrome {
          background-image: linear-gradient(to bottom, #eee 0%, #999 50%, #777 51%, #555 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.5));
        }
        .text-rainbow {
          animation: rainbow 3s linear infinite;
        }
        .text-fire {
          animation: fire 2s ease-in-out infinite;
        }
        .text-ice {
          animation: ice 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}