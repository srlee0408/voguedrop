import React from 'react';

interface PlayerControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isReady: boolean;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (volume: number) => void;
  onMuteToggle: () => void;
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export function PlayerControls({
  isPlaying,
  currentTime,
  duration,
  volume,
  isMuted,
  isReady,
  onPlayPause,
  onSeek,
  onVolumeChange,
  onMuteToggle,
}: PlayerControlsProps) {
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const volumeProgress = isMuted ? 0 : volume * 100;

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSeek(parseFloat(e.target.value));
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onVolumeChange(parseFloat(e.target.value));
  };

  return (
    <div className="bg-gray-800 p-4 relative z-[10000] flex-shrink-0">
      <div className="flex flex-col gap-3">
        {/* 진행 바 */}
        <div className="flex items-center gap-3">
          <span className="text-white text-sm min-w-[50px]">
            {formatTime(currentTime)}
          </span>
          <input
            type="range"
            min="0"
            max={duration}
            value={currentTime}
            onChange={handleSeekChange}
            disabled={!isReady}
            className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            style={{
              background: `linear-gradient(to right, #38f47cf9 ${progress}%, #4b5563 ${progress}%)`
            }}
          />
          <span className="text-white text-sm min-w-[50px] text-right">
            {formatTime(duration)}
          </span>
        </div>
        
        {/* 컨트롤 버튼들 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* 재생/일시정지 버튼 */}
            <button
              onClick={onPlayPause}
              disabled={!isReady}
              className={`p-3 rounded-full transition-colors ${
                isReady 
                  ? 'bg-[#38f47cf9] hover:bg-[#38f47cf9]/80 cursor-pointer' 
                  : 'bg-gray-600 cursor-not-allowed opacity-50'
              }`}
              title={!isReady ? 'Rendering in progress...' : ''}
            >
              <i className={`${isPlaying ? 'ri-pause-fill' : 'ri-play-fill'} text-2xl ${
                isReady ? 'text-black' : 'text-gray-400'
              }`}></i>
            </button>
            
            {/* 볼륨 컨트롤 */}
            <div className="flex items-center gap-2">
              <button
                onClick={onMuteToggle}
                className="p-2 text-white hover:text-[#38f47cf9] transition-colors"
              >
                <i className={`${
                  isMuted ? 'ri-volume-mute-fill' : 'ri-volume-up-fill'
                } text-xl`}></i>
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-24 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer volume-slider"
                style={{
                  background: `linear-gradient(to right, #38f47cf9 ${volumeProgress}%, #4b5563 ${volumeProgress}%)`
                }}
              />
            </div>
          </div>
          
          {/* 우측 정보 */}
          <div className="text-white text-sm">
            <span className="text-gray-400">Fullscreen Preview</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          background: #38f47cf9;
          border-radius: 50%;
          cursor: pointer;
        }
        
        .slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          background: #38f47cf9;
          border-radius: 50%;
          cursor: pointer;
          border: none;
        }

        .volume-slider::-webkit-slider-thumb {
          appearance: none;
          width: 12px;
          height: 12px;
          background: #38f47cf9;
          border-radius: 50%;
          cursor: pointer;
        }
        
        .volume-slider::-moz-range-thumb {
          width: 12px;
          height: 12px;
          background: #38f47cf9;
          border-radius: 50%;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  );
}