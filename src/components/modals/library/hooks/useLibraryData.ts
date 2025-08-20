import { useState, useEffect, useCallback } from 'react';
import { LibraryVideo, LibraryProject, UserUploadedVideo } from '@/types/video-editor';
import { LibraryCounts } from '@/types/library-modal';
import { useAuth } from '@/lib/auth/AuthContext';

interface UseLibraryDataReturn {
  clipItems: LibraryVideo[];
  projectItems: LibraryProject[];
  uploadItems: UserUploadedVideo[];
  counts: LibraryCounts;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateUploadItems: (newItem: UserUploadedVideo) => void;
  updateCounts: (key: keyof LibraryCounts, delta: number) => void;
}

/**
 * Library 데이터를 관리하는 커스텀 훅
 * @param isOpen - 모달이 열려있는지 여부
 * @returns Library 데이터와 관련 메서드
 */
export function useLibraryData(isOpen: boolean): UseLibraryDataReturn {
  const [clipItems, setClipItems] = useState<LibraryVideo[]>([]);
  const [projectItems, setProjectItems] = useState<LibraryProject[]>([]);
  const [uploadItems, setUploadItems] = useState<UserUploadedVideo[]>([]);
  const [counts, setCounts] = useState<LibraryCounts>({ clips: 0, projects: 0, uploads: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchLibraryData = useCallback(async () => {
    if (!user) {
      setClipItems([]);
      setProjectItems([]);
      setUploadItems([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/canvas/library?limit=100');
      
      if (!response.ok) {
        throw new Error('Failed to fetch library data');
      }
      
      const data = await response.json();
      
      // 응답 데이터 처리
      const clips = data.clips || data.videos || [];
      const projects = data.projects || [];
      const uploads = data.uploads || [];
      
      setClipItems(clips);
      setProjectItems(projects);
      setUploadItems(uploads);
      
      setCounts(data.counts || { 
        clips: clips.length, 
        projects: projects.length,
        uploads: uploads.length
      });
    } catch (err) {
      console.error('Failed to fetch library data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load library. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // 모달이 열릴 때 데이터 페칭
  useEffect(() => {
    if (isOpen && user) {
      fetchLibraryData();
    } else if (isOpen && !user) {
      setClipItems([]);
      setProjectItems([]);
      setUploadItems([]);
      setIsLoading(false);
    }
  }, [isOpen, user, fetchLibraryData]);

  // 업로드 아이템 추가 메서드
  const updateUploadItems = useCallback((newItem: UserUploadedVideo) => {
    setUploadItems(prev => [newItem, ...prev]);
  }, []);

  // 카운트 업데이트 메서드
  const updateCounts = useCallback((key: keyof LibraryCounts, delta: number) => {
    setCounts(prev => ({ ...prev, [key]: prev[key] + delta }));
  }, []);

  return {
    clipItems,
    projectItems,
    uploadItems,
    counts,
    isLoading,
    error,
    refetch: fetchLibraryData,
    updateUploadItems,
    updateCounts
  };
}