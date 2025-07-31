'use client';

import { useTranslation } from '@/hooks/useTranslation';

interface ControlBarProps {
  selectedSound: string;
  onSelectSound: (sound: string) => void;
  onAddSound: () => void;
}

/**
 * Video Editor Control Bar Component
 * - Video control buttons (Final Video, Preview, Save)
 * - Sound selection options
 * - Action buttons (Sound, Create)
 */

export default function ControlBar({ selectedSound, onSelectSound, onAddSound }: ControlBarProps) {
  const { t } = useTranslation();
  
  const soundOptions = [
    { key: 'epicTheme', label: t('videoEditor.controls.soundOptions.epicTheme') },
    { key: 'dramatic', label: t('videoEditor.controls.soundOptions.dramatic') },
    { key: 'ambient', label: t('videoEditor.controls.soundOptions.ambient') },
    { key: 'sfx', label: t('videoEditor.controls.soundOptions.sfx') },
  ];

  return (
    <div className="bg-gray-900 border-t border-gray-700 p-4">
      <div className="max-w-[1920px] mx-auto bg-black rounded-lg">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-4">
          <div className="flex items-center justify-start lg:justify-start gap-4 flex-wrap">
            <div className="flex flex-col items-center gap-1 min-w-[80px]">
              <button className="w-12 h-12 flex items-center justify-center bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
                <i className="ri-movie-line text-xl text-primary"></i>
              </button>
              <span className="text-xs text-primary whitespace-nowrap">{t('videoEditor.controls.finalVideo')}</span>
            </div>
            <div className="flex flex-col items-center gap-1 min-w-[80px]">
              <button className="w-12 h-12 flex items-center justify-center bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
                <i className="ri-play-circle-line text-xl text-primary"></i>
              </button>
              <span className="text-xs text-primary whitespace-nowrap">{t('videoEditor.controls.preview')}</span>
            </div>
            <div className="flex flex-col items-center gap-1 min-w-[80px]">
              <button className="w-12 h-12 flex items-center justify-center bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
                <i className="ri-save-line text-xl text-primary"></i>
              </button>
              <span className="text-xs text-primary whitespace-nowrap">{t('videoEditor.controls.saveFile')}</span>
            </div>
          </div>
          <div className="flex items-center justify-start lg:justify-end gap-4">
            <div className="flex items-center gap-2 bg-gray-800 rounded-lg p-2 overflow-x-auto">
              {soundOptions.map((sound) => (
                <div 
                  key={sound.key}
                  onClick={() => onSelectSound(sound.label)}
                  className={`flex flex-col items-center gap-1 px-3 py-2 min-w-[80px] rounded-lg transition-colors cursor-pointer ${
                    selectedSound === sound.label 
                      ? 'bg-primary' 
                      : 'hover:bg-gray-700'
                  }`}
                >
                  <div className="w-8 h-8 flex items-center justify-center">
                    <i className={`ri-volume-up-line text-xl ${
                      selectedSound === sound.label ? 'text-black' : 'text-primary'
                    }`}></i>
                  </div>
                  <span className={`text-xs whitespace-nowrap ${
                    selectedSound === sound.label ? 'text-black' : 'text-primary'
                  }`}>{sound.label}</span>
                </div>
              ))}
            </div>
            <div className="flex flex-col items-center gap-1 min-w-[80px]">
              <button 
                onClick={onAddSound}
                className="w-12 h-12 flex items-center justify-center bg-primary rounded-button hover:opacity-80 transition-opacity"
              >
                <i className="ri-magic-line text-xl text-black"></i>
              </button>
              <span className="text-xs text-primary font-medium whitespace-nowrap">{t('videoEditor.controls.sound')}</span>
            </div>
            <div className="flex flex-col items-center gap-1 min-w-[80px]">
              <button className="w-12 h-12 flex items-center justify-center bg-primary rounded-button hover:opacity-80 transition-opacity">
                <i className="ri-arrow-up-line text-xl text-black"></i>
              </button>
              <span className="text-xs text-primary font-medium whitespace-nowrap">{t('videoEditor.controls.create')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}