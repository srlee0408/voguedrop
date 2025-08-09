'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { TextClip, TextStyle, TextEffect } from '@/types/video-editor';

interface TextEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddText: (text: Partial<TextClip>) => void;
  editingClip?: TextClip;
}

const fontFamilies = [
  { value: 'default', label: 'Default' },
  { value: 'Arial', label: 'Arial' },
  { value: 'Helvetica', label: 'Helvetica' },
  { value: 'Times New Roman', label: 'Times New Roman' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Courier New', label: 'Courier New' },
];

const presetColors = [
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
];

export default function TextEditorModal({
  isOpen,
  onClose,
  onAddText,
  editingClip,
}: TextEditorModalProps) {
  const [content, setContent] = useState(editingClip?.content || '');
  const [style, setStyle] = useState<TextStyle>(
    editingClip?.style || {
      fontSize: 24, // 기본 크기를 크게 변경
      fontFamily: 'default',
      color: '#FFFFFF',
      alignment: 'center',
      fontWeight: 'bold', // 기본 bold로 변경
      verticalPosition: 'middle',
      backgroundColor: '',
      backgroundOpacity: 0.7,
    }
  );
  const [selectedEffect, setSelectedEffect] = useState<TextEffect>(
    editingClip?.effect || 'none'
  );

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (content.trim()) {
      onAddText({
        content,
        style,
        effect: selectedEffect,
        duration: 200,
        position: 0,
      });
      onClose();
      setContent('');
      setSelectedEffect('none');
    }
  };

  const getEffectStyle = (effect: TextEffect) => {
    switch (effect) {
      case 'gradient':
        return {
          background: 'linear-gradient(90deg, #38f47c, #3b82f6, #a855f7, #ec4899, #38f47c)',
          backgroundSize: '200% auto',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        };
      case 'glow':
        return {
          textShadow: '0 0 20px rgba(255,255,255,0.9), 0 0 40px rgba(56,244,124,0.7)',
        };
      case 'typing':
        return {
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          borderRight: '3px solid rgba(255,255,255,0.7)',
          display: 'inline-block',
          width: 'fit-content',
        };
      case 'pulse':
      case 'bounce':
      case 'spin':
      case 'wave':
      case 'zoom':
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
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="8"
                    max="72"
                    value={style.fontSize}
                    onChange={(e) =>
                      setStyle({ ...style, fontSize: parseInt(e.target.value) || 16 })
                    }
                    className="w-20 px-3 py-2 bg-gray-900 rounded-lg text-sm text-white focus:ring-2 focus:ring-[#38f47cf9] focus:outline-none"
                  />
                  <div className="flex gap-1">
                    <button
                      onClick={() =>
                        setStyle({ ...style, fontSize: Math.max(8, style.fontSize - 1) })
                      }
                      className="w-7 h-7 flex items-center justify-center bg-gray-900 rounded hover:bg-gray-700"
                    >
                      <i className="ri-subtract-line text-white"></i>
                    </button>
                    <button
                      onClick={() =>
                        setStyle({ ...style, fontSize: Math.min(72, style.fontSize + 1) })
                      }
                      className="w-7 h-7 flex items-center justify-center bg-gray-900 rounded hover:bg-gray-700"
                    >
                      <i className="ri-add-line text-white"></i>
                    </button>
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
              <label className="block text-sm font-medium mb-3 text-gray-300">
                Live Preview
              </label>
              <div className="flex-1 bg-black rounded-lg p-6 flex items-center relative overflow-hidden">
                {/* Grid Background */}
                <div className="absolute inset-0 opacity-5">
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
                      fontFamily: style.fontFamily === 'default' ? 'inherit' : style.fontFamily,
                      color: selectedEffect === 'gradient' ? 'transparent' : style.color,
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
      `}</style>
    </div>
  );
}