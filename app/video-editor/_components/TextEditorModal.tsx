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
  { value: 'pulse', label: 'Pulse', className: 'animate-pulse' },
  { value: 'bounce', label: 'Bounce', className: 'animate-bounce' },
  { value: 'gradient', label: 'Gradient' },
  { value: 'spin', label: 'Spin', className: 'animate-spin' },
  { value: 'shake', label: 'Shake' },
  { value: 'slide', label: 'Slide' },
  { value: 'fade', label: 'Fade' },
  { value: 'typing', label: 'Typing' },
  { value: 'glow', label: 'Glow' },
  { value: 'wave', label: 'Wave' },
  { value: 'zoom', label: 'Zoom' },
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
          background: 'linear-gradient(45deg, #38f47c, #3b82f6)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        };
      case 'glow':
        return {
          textShadow: '0 0 10px rgba(56, 244, 124, 0.8)',
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
      <div className="bg-gray-800 rounded-lg w-[500px] max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-medium text-white">Text Editor</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center hover:bg-gray-700 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Text Content */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">
              Text Content
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full h-24 bg-gray-900 rounded-lg p-3 text-sm text-white resize-none focus:ring-2 focus:ring-[#38f47cf9] focus:outline-none"
              placeholder="Enter your text..."
            />
          </div>

          {/* Font Style */}
          <div>
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

          {/* Font Size */}
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
                className="w-20 px-3 py-1.5 bg-gray-900 rounded-lg text-sm text-white focus:ring-2 focus:ring-[#38f47cf9] focus:outline-none"
              />
              <span className="text-sm text-gray-400">px</span>
              <div className="flex gap-1 ml-2">
                <button
                  onClick={() =>
                    setStyle({ ...style, fontSize: Math.max(8, style.fontSize - 1) })
                  }
                  className="w-6 h-6 flex items-center justify-center bg-gray-900 rounded hover:bg-gray-700"
                >
                  <i className="ri-subtract-line text-white"></i>
                </button>
                <button
                  onClick={() =>
                    setStyle({ ...style, fontSize: Math.min(72, style.fontSize + 1) })
                  }
                  className="w-6 h-6 flex items-center justify-center bg-gray-900 rounded hover:bg-gray-700"
                >
                  <i className="ri-add-line text-white"></i>
                </button>
              </div>
            </div>
          </div>

          {/* Text Color */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">
              Text Color
            </label>
            <div className="flex items-center gap-4">
              <input
                type="color"
                value={style.color}
                onChange={(e) => setStyle({ ...style, color: e.target.value })}
                className="w-10 h-10 rounded cursor-pointer bg-transparent"
              />
              <div className="grid grid-cols-8 gap-2">
                {presetColors.map((color) => (
                  <button
                    key={color}
                    onClick={() => setStyle({ ...style, color })}
                    className={`w-8 h-8 rounded-full border-2 ${
                      style.color === color ? 'border-[#38f47cf9]' : 'border-transparent'
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
            <div className="grid grid-cols-3 gap-2">
              {textEffects.map((effect) => (
                <button
                  key={effect.value}
                  onClick={() => setSelectedEffect(effect.value)}
                  className={`px-3 py-2 bg-gray-900 rounded text-sm hover:bg-gray-700 transition-colors ${
                    selectedEffect === effect.value
                      ? 'ring-2 ring-[#38f47cf9]'
                      : ''
                  } ${effect.className || ''}`}
                  style={effect.value === 'gradient' ? getEffectStyle('gradient') : {}}
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
                className={`flex-1 px-3 py-2 bg-gray-900 rounded text-sm hover:bg-gray-700 ${
                  style.alignment === 'left' ? 'bg-gray-700' : ''
                }`}
              >
                <i className="ri-align-left text-white"></i>
              </button>
              <button
                onClick={() => setStyle({ ...style, alignment: 'center' })}
                className={`flex-1 px-3 py-2 bg-gray-900 rounded text-sm hover:bg-gray-700 ${
                  style.alignment === 'center' ? 'bg-gray-700' : ''
                }`}
              >
                <i className="ri-align-center text-white"></i>
              </button>
              <button
                onClick={() => setStyle({ ...style, alignment: 'right' })}
                className={`flex-1 px-3 py-2 bg-gray-900 rounded text-sm hover:bg-gray-700 ${
                  style.alignment === 'right' ? 'bg-gray-700' : ''
                }`}
              >
                <i className="ri-align-right text-white"></i>
              </button>
            </div>
          </div>

          {/* Preview */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">
              Preview
            </label>
            <div className="bg-black rounded-lg p-4 min-h-[100px] flex items-center justify-center">
              <div
                className={`${getEffectClass(selectedEffect)}`}
                style={{
                  fontSize: `${style.fontSize}px`,
                  fontFamily: style.fontFamily === 'default' ? 'inherit' : style.fontFamily,
                  color: selectedEffect === 'gradient' ? undefined : style.color,
                  textAlign: style.alignment,
                  fontWeight: style.fontWeight,
                  ...getEffectStyle(selectedEffect),
                }}
              >
                {content || 'Your text will appear here'}
              </div>
            </div>
          </div>
        </div>

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
        @keyframes shake {
          0%,
          100% {
            transform: translateX(0);
          }
          25% {
            transform: translateX(-5px);
          }
          75% {
            transform: translateX(5px);
          }
        }
        @keyframes slide {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        @keyframes fade {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.3;
          }
        }
        @keyframes typing {
          from {
            width: 0;
          }
          to {
            width: 100%;
          }
        }
        @keyframes wave {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        @keyframes zoom {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.2);
          }
        }

        .animate-shake {
          animation: shake 0.5s ease-in-out infinite;
        }
        .animate-slide {
          animation: slide 2s ease-in-out infinite;
        }
        .animate-fade {
          animation: fade 2s ease-in-out infinite;
        }
        .animate-typing {
          animation: typing 3s steps(30) infinite;
        }
        .animate-wave {
          animation: wave 2s ease-in-out infinite;
        }
        .animate-zoom {
          animation: zoom 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}