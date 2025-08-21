'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useFavoritesManager } from '../_hooks/useFavoritesManager';
import type { FavoritesManagerReturn } from '../_types';

/**
 * Favorites Context의 값 타입
 * @interface FavoritesContextValue
 */
interface FavoritesContextValue {
  /** 즐겨찾기 관리 객체와 제어 함수들 */
  favorites: FavoritesManagerReturn;
}

const FavoritesContext = createContext<FavoritesContextValue | undefined>(undefined);

/**
 * Canvas 즐겨찾기 상태를 사용하는 훅
 * @returns {FavoritesContextValue} 즐겨찾기 관리 객체와 제어 함수들
 * @throws {Error} FavoritesProvider 없이 사용할 경우 에러 발생
 * 
 * @example
 * ```tsx
 * function VideoCard({ video }: { video: GeneratedVideo }) {
 *   const { favorites } = useFavorites();
 *   
 *   const handleToggleFavorite = async () => {
 *     await favorites.toggleFavorite(video.id);
 *   };
 *   
 *   return (
 *     <div>
 *       <video src={video.video_url} />
 *       <button 
 *         onClick={handleToggleFavorite}
 *         disabled={favorites.isLoading}
 *       >
 *         {favorites.isFavorite(video.id) ? '❤️' : '🤍'}
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useFavorites(): FavoritesContextValue {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites must be used within FavoritesProvider');
  }
  return context;
}

/**
 * FavoritesProvider 컴포넌트의 Props
 * @interface FavoritesProviderProps
 */
interface FavoritesProviderProps {
  /** 하위 컴포넌트들 */
  children: ReactNode;
}

/**
 * 즐겨찾기 관리를 담당하는 Context Provider
 * 
 * 관리하는 상태:
 * - 즐겨찾기 비디오 ID 목록 (Set<string>)
 * - 로딩 상태: API 요청 진행 중 여부
 * - 에러 상태: 즐겨찾기 작업 실패 시 에러 메시지
 * 
 * 제공하는 기능:
 * - 즐겨찾기 토글: 비동기 API 요청으로 서버와 동기화
 * - 즐겨찾기 상태 확인: 특정 비디오의 즐겨찾기 여부
 * - 즐겨찾기 목록 새로고침: 서버에서 최신 데이터 가져오기
 * - 에러 처리: 네트워크 오류 및 API 실패 처리
 * 
 * @param {FavoritesProviderProps} props - Provider 속성
 * @returns {React.ReactElement} Context Provider 컴포넌트
 * 
 * @example
 * ```tsx
 * function CanvasPage() {
 *   return (
 *     <FavoritesProvider>
 *       <VideoHistory />
 *       <FavoritesList />
 *     </FavoritesProvider>
 *   );
 * }
 * ```
 */
export function FavoritesProvider({ children }: FavoritesProviderProps): React.ReactElement {
  const favorites = useFavoritesManager();

  const contextValue: FavoritesContextValue = {
    favorites,
  };

  return (
    <FavoritesContext.Provider value={contextValue}>
      {children}
    </FavoritesContext.Provider>
  );
}