'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useFavorites as useSharedFavorites } from '@/shared/hooks/useFavorites';

/**
 * FavoritesContext - Canvas 생성 결과 즐겨찾기 관리
 * 
 * @description
 * Canvas에서 생성된 AI 비디오의 즐겨찾기 상태를 관리합니다.
 * 사용자가 마음에 드는 생성 결과를 즐겨찾기로 저장하고 관리할 수 있습니다.
 * 
 * @manages
 * - favoriteVideos: 즐겨찾기로 설정된 비디오 ID 목록
 * - favoritesData: 즐겨찾기 비디오의 상세 데이터
 * - isLoading: 즐겨찾기 데이터 로딩 상태
 * - error: 즐겨찾기 관련 오류 상태
 * 
 * @features
 * - 비디오 즐겨찾기 추가/제거
 * - 즐겨찾기 목록 실시간 동기화
 * - 즐겨찾기 상태 UI 반영
 * - 서버와 로컬 상태 동기화
 * 
 * @persistence
 * - Supabase를 통한 서버 저장
 * - 사용자별 개별 즐겨찾기 관리
 * - 로그인 상태에 따른 동기화
 */
interface FavoritesContextValue {
  /** 즐겨찾기 관리 객체와 제어 함수들 */
  favorites: ReturnType<typeof useSharedFavorites>;
}

const FavoritesContext = createContext<FavoritesContextValue | undefined>(undefined);

/**
 * Canvas 즐겨찾기 상태를 사용하는 훅
 * 
 * @returns {FavoritesContextValue} 즐겨찾기 관리 객체와 제어 함수들
 * @throws {Error} FavoritesProvider 없이 사용할 경우 에러 발생
 * 
 * @example
 * ```tsx
 * function VideoCard({ videoId }: { videoId: string }) {
 *   const { favorites } = useFavorites();
 *   
 *   const isFavorite = favorites.favoriteVideos.includes(videoId);
 *   
 *   const toggleFavorite = async () => {
 *     if (isFavorite) {
 *       await favorites.removeFavorite(videoId);
 *     } else {
 *       await favorites.addFavorite(videoId);
 *     }
 *   };
 *   
 *   return (
 *     <div>
 *       <button onClick={toggleFavorite}>
 *         {isFavorite ? '❤️' : '🤍'}
 *       </button>
 *     </div>
 *   );
 * }
 * ```
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
export function FavoritesProvider({ children }: FavoritesProviderProps) {
  const favorites = useSharedFavorites();

  const contextValue: FavoritesContextValue = {
    favorites,
  };

  return (
    <FavoritesContext.Provider value={contextValue}>
      {children}
    </FavoritesContext.Provider>
  );
}