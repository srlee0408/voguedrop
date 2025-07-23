'use client';

import { useTranslation } from '@/hooks/useTranslation';

/**
 * 비디오 에디터 헤더 컴포넌트
 * - 프로젝트 제목 표시
 * - 탭 네비게이션 (Clips, Edited, Library)
 * - 사용자 액션 버튼들
 */
export default function Header() {
  const { t } = useTranslation();

  return (
    <header className="bg-black border-b border-gray-700 px-2 sm:px-4 py-3 flex items-center justify-between">
      {/* 왼쪽 섹션: 네비게이션 */}
      <div className="flex items-center gap-2 sm:gap-4">
        <button className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
          <i className="ri-close-line"></i>
        </button>
        
        <div className="flex items-center gap-4 sm:gap-6 text-sm">
          <div className="hidden sm:flex items-center gap-4">
            <span className="font-medium text-gray-300">
              {t('videoEditor.header.projectTitle')}
            </span>
          </div>
          
          <nav className="flex items-center gap-3 sm:gap-6 text-gray-400">
            <button className="flex items-center gap-1 sm:gap-2 hover:text-white transition-colors">
              <i className="ri-video-line"></i>
              <span className="hidden sm:inline">{t('videoEditor.header.tabs.clips')}</span>
            </button>
            <button className="flex items-center gap-1 sm:gap-2 hover:text-white transition-colors">
              <i className="ri-edit-2-line"></i>
              <span className="text-primary hidden sm:inline">
                {t('videoEditor.header.tabs.edited')}
              </span>
            </button>
            <a href="#" className="flex items-center gap-1 sm:gap-2 hover:text-white transition-colors">
              <i className="ri-folder-line"></i>
              <span className="hidden sm:inline">{t('videoEditor.header.tabs.library')}</span>
            </a>
          </nav>
        </div>
      </div>

      {/* 오른쪽 섹션: 사용자 액션 */}
      <div className="flex items-center gap-2 sm:gap-3">
        <button className="w-8 h-8 hidden md:flex items-center justify-center text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-all">
          <i className="ri-arrow-go-back-line"></i>
        </button>
        <button className="w-8 h-8 hidden md:flex items-center justify-center text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-all">
          <i className="ri-arrow-go-forward-line"></i>
        </button>
        <button className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-all">
          <i className="ri-timer-line"></i>
        </button>
        <button className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-all">
          <i className="ri-notification-line"></i>
        </button>
        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-sm font-medium text-black">
          A
        </div>
      </div>
    </header>
  );
}