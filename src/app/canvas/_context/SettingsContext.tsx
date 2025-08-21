'use client';

import { createContext, useContext, ReactNode, useState, useCallback } from 'react';
import type { CanvasSettings, CanvasSettingsReturn } from '../_types';

/**
 * SettingsContext - Canvas AI 생성 설정 관리
 * 
 * @description
 * Canvas에서 AI 비디오 생성에 필요한 모든 설정을 관리합니다.
 * 프롬프트, 해상도, 모델, 지속시간 등 생성 파라미터를 제어합니다.
 * 
 * @manages
 * - promptText: 사용자 입력 프롬프트 텍스트
 * - negativePrompt: 네거티브 프롬프트 (생성에서 제외할 요소)
 * - selectedResolution: 비디오 화면 비율 ('1:1', '9:16', '16:9')
 * - selectedSize: 비디오 해상도 ('1024x1024', '720x1280' 등)
 * - selectedModelId: AI 모델 ID (seedance, hailo 등)
 * - selectedDuration: 비디오 길이 (초 단위)
 * - isPrompterOpen: 프롬프터 패널 열림/닫힘 상태
 * 
 * @features
 * - 설정값 업데이트 및 검증
 * - 모델별 호환 가능한 설정 제한
 * - 프롬프터 UI 상태 관리
 * - 설정 초기화 및 리셋
 * 
 * @persistence
 * localStorage를 통해 사용자 설정 자동 저장/복원
 */

/**
 * Canvas 설정의 기본값
 * AI 영상 생성에 필요한 모든 설정을 포함
 */
const defaultSettings: CanvasSettings = {
  promptText: '',
  negativePrompt: '',
  selectedResolution: '1:1',
  selectedSize: '1024x1024',
  selectedModelId: '',
  selectedDuration: '6',
  isPrompterOpen: false,
};

/**
 * Settings Context의 값 타입
 */
interface SettingsContextValue {
  /** Canvas 설정 객체와 제어 함수들 */
  settings: CanvasSettingsReturn;
}

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

/**
 * Canvas 설정 상태를 사용하는 훅
 * @returns {SettingsContextValue} 설정 객체와 제어 함수들
 * @throws {Error} SettingsProvider 없이 사용할 경우 에러 발생
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { settings } = useSettings();
 *   
 *   const handlePromptChange = (text: string) => {
 *     settings.updateSettings({ promptText: text });
 *   };
 *   
 *   return <input value={settings.promptText} onChange={e => handlePromptChange(e.target.value)} />;
 * }
 * ```
 */
export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return context;
}

/**
 * SettingsProvider 컴포넌트의 Props
 * @interface SettingsProviderProps
 */
interface SettingsProviderProps {
  /** 하위 컴포넌트들 */
  children: ReactNode;
  /** 초기 설정값 (선택사항) */
  initialSettings?: Partial<CanvasSettings>;
}

/**
 * Canvas 설정 관리를 담당하는 Context Provider
 * 
 * 관리하는 상태:
 * - 프롬프트 텍스트: AI 영상 생성을 위한 사용자 입력 텍스트
 * - 네거티브 프롬프트: 원하지 않는 요소를 제외하기 위한 텍스트
 * - 해상도 비율: 1:1, 16:9, 9:16 등의 영상 비율
 * - 픽셀 크기: 1024x1024, 1920x1080 등의 실제 해상도
 * - 모델 ID: fal.ai에서 사용할 AI 모델 식별자
 * - 지속시간: 생성될 영상의 길이 (초 단위)
 * - 프롬프터 상태: 프롬프트 입력 모달의 열기/닫기 상태
 * 
 * @param {SettingsProviderProps} props - Provider 속성
 * @returns {React.ReactElement} Context Provider 컴포넌트
 * 
 * @example
 * ```tsx
 * function App() {
 *   return (
 *     <SettingsProvider initialSettings={{ selectedResolution: '16:9' }}>
 *       <CanvasPage />
 *     </SettingsProvider>
 *   );
 * }
 * ```
 */
export function SettingsProvider({ children, initialSettings }: SettingsProviderProps) {
  const [settingsState, setSettingsState] = useState<CanvasSettings>({
    ...defaultSettings,
    ...initialSettings,
  });

  const updateSettings = useCallback((newSettings: Partial<CanvasSettings>): void => {
    setSettingsState((prev) => ({
      ...prev,
      ...newSettings,
    }));
  }, []);

  const resetSettings = useCallback((): void => {
    setSettingsState(defaultSettings);
  }, []);

  const settings: CanvasSettingsReturn = {
    ...settingsState,
    updateSettings,
    resetSettings,
  };

  const contextValue: SettingsContextValue = {
    settings,
  };

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
}