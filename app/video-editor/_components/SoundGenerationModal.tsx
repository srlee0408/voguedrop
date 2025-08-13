'use client';

import { useState, useEffect } from 'react';
import { SoundGenerationProgress } from './SoundGenerationProgress';

interface SoundGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSoundGenerated: (sound: { url: string; title?: string; duration: number }) => void;
}

// 진행률 계산 유틸리티 함수 (사운드 생성용 - 15초 기준)
const calculateProgressForElapsedTime = (elapsedSeconds: number, expectedDuration: number = 15): number => {
  const checkpoints = [
    { time: 2, progress: 15 },
    { time: 4, progress: 30 },
    { time: 6, progress: 50 },
    { time: 8, progress: 65 },
    { time: 10, progress: 80 },
    { time: 12, progress: 88 },
    { time: 15, progress: 90 }
  ];
  
  let targetProgress = 0;
  
  for (let i = 0; i < checkpoints.length; i++) {
    const checkpoint = checkpoints[i];
    const nextCheckpoint = checkpoints[i + 1];
    
    if (elapsedSeconds >= checkpoint.time) {
      if (!nextCheckpoint || elapsedSeconds < nextCheckpoint.time) {
        if (nextCheckpoint) {
          const timeRatio = (elapsedSeconds - checkpoint.time) / (nextCheckpoint.time - checkpoint.time);
          const progressDiff = nextCheckpoint.progress - checkpoint.progress;
          targetProgress = checkpoint.progress + (progressDiff * timeRatio);
        } else {
          targetProgress = checkpoint.progress;
        }
        break;
      }
    } else if (i === 0) {
      targetProgress = (elapsedSeconds / checkpoint.time) * checkpoint.progress;
      break;
    }
  }
  
  if (elapsedSeconds > expectedDuration) {
    const overtime = elapsedSeconds - expectedDuration;
    const slowdown = Math.log(1 + overtime / expectedDuration) * 2;
    targetProgress = Math.max(85, 90 - slowdown);
  }
  
  // smoothIncrement 제거 - 예측 가능한 진행률을 위해
  
  return Math.min(targetProgress, 90);
};

const calculateCompletionAnimationDuration = (currentProgress: number): number => {
  const remainingProgress = 100 - currentProgress;
  return Math.min(3000, Math.max(500, (remainingProgress / 100) * 3000));
};

export default function SoundGenerationModal({ isOpen, onClose, onSoundGenerated }: SoundGenerationModalProps) {
  const [prompt, setPrompt] = useState('');
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);

  // 모달이 열릴 때 상태 초기화
  useEffect(() => {
    if (isOpen) {
      setProgress(0);
      setError(null);
      setCurrentJobId(null);
      setIsGenerating(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a sound description.');
      return;
    }

    if (prompt.length > 450) {
      setError('Description cannot exceed 450 characters.');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // 1. API 호출로 job 시작
      const response = await fetch('/api/sound/generate-async', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          duration_seconds: duration,
          title: title.trim() || undefined
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Sound generation failed');
      }

      const { jobId } = data;
      setCurrentJobId(jobId);

      // 2. 진행률 시뮬레이션 시작
      const startTime = Date.now();
      const progressInterval = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        const newProgress = calculateProgressForElapsedTime(elapsed, 15); // 15초 예상
        setProgress(newProgress);
      }, 500);

      // 3. 2초마다 상태 폴링 (더 빠른 완료 감지)
      let pollCount = 0;
      const maxPolls = 60; // 최대 120초 (2분)
      
      const pollInterval = setInterval(async () => {
        pollCount++;
        
        // 5분 후에는 poll 엔드포인트 사용
        const endpoint = pollCount > 150  // 150 * 2초 = 300초 = 5분
          ? `/api/sound/jobs/${jobId}/poll`
          : `/api/sound/jobs/${jobId}`;
        
        const statusResponse = await fetch(endpoint);
        const status = await statusResponse.json();
        
        if (status.status === 'completed') {
          // 완료 애니메이션
          clearInterval(progressInterval);
          clearInterval(pollInterval);
          
          // 현재 progress state 값을 정확히 캡처하기 위해 setProgress 사용
          setProgress(currentProgress => {
            const animationDuration = calculateCompletionAnimationDuration(currentProgress);
            const animationStartTime = Date.now();
            
            const animateToComplete = () => {
              const elapsed = Date.now() - animationStartTime;
              const ratio = Math.min(elapsed / animationDuration, 1);
              const easeOut = 1 - Math.pow(1 - ratio, 3);
              const targetProgress = currentProgress + (100 - currentProgress) * easeOut;
              setProgress(Math.floor(targetProgress));
              
              if (ratio < 1) {
                requestAnimationFrame(animateToComplete);
              } else {
                // 완료 처리
                setTimeout(() => {
                  onSoundGenerated({
                    url: status.result.audioUrl,
                    title: status.result.title,
                    duration: status.result.duration
                  });
                  onClose(); // handleClose 대신 onClose 직접 호출
                }, 500);
              }
            };
            
            animateToComplete();
            return currentProgress; // 현재 값 유지
          });
        } else if (status.status === 'failed') {
          clearInterval(progressInterval);
          clearInterval(pollInterval);
          setError(status.error || 'Sound generation failed');
          setIsGenerating(false);
          setProgress(0);
        } else if (pollCount >= maxPolls) {
          clearInterval(progressInterval);
          clearInterval(pollInterval);
          setError('Sound generation timed out.');
          setIsGenerating(false);
          setProgress(0);
        }
      }, 2000); // 2초마다 polling

    } catch (err) {
      console.error('Sound generation error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during sound generation.');
      setIsGenerating(false);
      setProgress(0);
    }
  };

  const handleClose = () => {
    if (!isGenerating) {
      setPrompt('');
      setTitle('');
      setDuration(5);
      setError(null);
      setProgress(0);
      setCurrentJobId(null);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg w-[600px] max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-medium">AI Sound Generation</h2>
          <button 
            onClick={handleClose}
            disabled={isGenerating}
            className="w-8 h-8 flex items-center justify-center hover:bg-gray-700 rounded-lg disabled:opacity-50"
          >
            <i className="ri-close-line"></i>
          </button>
        </div>
        
        <div className="flex-1 overflow-auto p-6 relative">
          {/* 진행 상태 오버레이 */}
          <SoundGenerationProgress 
            progress={progress}
            isVisible={isGenerating}
            jobId={currentJobId || undefined}
          />
          
          <div className="space-y-6">
            {/* 프롬프트 입력 */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Sound Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., A gentle wind chime tinkling in a soft breeze"
                className="w-full px-4 py-3 bg-gray-700 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                rows={4}
                maxLength={450}
                disabled={isGenerating}
              />
              <div className="text-xs text-gray-400 mt-1 text-right">
                {prompt.length} / 450
              </div>
            </div>

            {/* 제목 입력 (선택사항) */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Title (Optional)
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Nature Sounds"
                className="w-full px-4 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={isGenerating}
              />
            </div>

            {/* 길이 선택 */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Duration: {duration} seconds
              </label>
              <input
                type="range"
                min="1"
                max="22"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full"
                disabled={isGenerating}
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>1 sec</span>
                <span>22 sec</span>
              </div>
            </div>

            {/* 에러 메시지 */}
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}
          </div>
        </div>
        
        <div className="p-6 border-t border-gray-700">
          <div className="flex gap-3 justify-end">
            <button 
              onClick={handleClose}
              disabled={isGenerating}
              className="px-6 py-2 bg-gray-700 rounded-button hover:bg-gray-600 disabled:opacity-50"
            >
              Cancel
            </button>
            <button 
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className="px-6 py-2 bg-primary rounded-button hover:bg-primary/90 text-black disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isGenerating ? (
                <>
                  <i className="ri-loader-4-line animate-spin"></i>
                  Generating...
                </>
              ) : (
                <>
                  <i className="ri-magic-line"></i>
                  Generate
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}