import { useCallback, useState, useRef, useEffect } from "react";
import type { GeneratedVideo } from "@/shared/types/canvas";
import type { SlotContent } from "@/features/canvas-generation/_types";

interface InitialSlotState {
  slotContents?: Array<SlotContent>;
  slotStates?: Array<"empty" | "generating" | "completed">;
  slotCompletedAt?: Array<number | null>;
}

/**
 * Canvas 슬롯 상태와 배치 규칙을 관리하는 훅
 * - 4개 슬롯의 콘텐츠/상태/완료시점을 관리
 * - 이미지 업로드/제거, 히스토리 비디오 토글 배치, 슬롯 선택 등의 로직 캡슐화
 * - localStorage 복원 지원
 * - WeakMap으로 메모리 관리 최적화 (자동 정리)
 */
export function useSlotManager(initialState?: InitialSlotState) {
  // WeakMap으로 비디오 객체와 슬롯 메타데이터 매핑 (자동 가비지 컬렉션)
  const videoMetadataRef = useRef(new WeakMap<GeneratedVideo, { slotIndex: number; timestamp: number }>())
  const slotCleanupTimeoutsRef = useRef<Map<number, NodeJS.Timeout>>(new Map())
  
  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    const cleanupTimeouts = slotCleanupTimeoutsRef.current
    return () => {
      cleanupTimeouts.forEach(timeout => clearTimeout(timeout))
      cleanupTimeouts.clear()
    }
  }, [])
  const [slotContents, setSlotContents] = useState<Array<SlotContent>>(
    initialState?.slotContents || [null, null, null, null]
  );
  const [slotStates, setSlotStates] = useState<Array<"empty" | "generating" | "completed">>(
    initialState?.slotStates || ["empty", "empty", "empty", "empty"]
  );
  const [slotCompletedAt, setSlotCompletedAt] = useState<Array<number | null>>(
    initialState?.slotCompletedAt || [null, null, null, null]
  );
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);
  const [activeVideo, setActiveVideo] = useState<GeneratedVideo | null>(null);

  /**
   * WeakMap에 비디오 메타데이터 저장 (메모리 효율적)
   */
  const trackVideoMetadata = useCallback((video: GeneratedVideo, slotIndex: number): void => {
    videoMetadataRef.current.set(video, { slotIndex, timestamp: Date.now() })
  }, [])

  /**
   * WeakMap에서 비디오 메타데이터 조회
   */
  const getVideoMetadata = useCallback((video: GeneratedVideo) => {
    return videoMetadataRef.current.get(video) || null
  }, [])

  /**
   * 자동 슬롯 정리 타이머 설정 (30분 후 자동 정리)
   */
  const scheduleSlotCleanup = useCallback((slotIndex: number): void => {
    const existingTimeout = slotCleanupTimeoutsRef.current.get(slotIndex)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
    }
    
    const timeout = setTimeout(() => {
      setSlotContents(prev => {
        const next = [...prev]
        // 슬롯이 여전히 completed 상태이고 30분이 지났으면 정리
        if (slotStates[slotIndex] === 'completed') {
          next[slotIndex] = null
        }
        return next
      })
      setSlotStates(prev => {
        const next = [...prev]
        if (next[slotIndex] === 'completed') {
          next[slotIndex] = 'empty'
        }
        return next
      })
      setSlotCompletedAt(prev => {
        const next = [...prev]
        if (slotStates[slotIndex] === 'completed') {
          next[slotIndex] = null
        }
        return next
      })
      slotCleanupTimeoutsRef.current.delete(slotIndex)
    }, 30 * 60 * 1000) // 30분
    
    slotCleanupTimeoutsRef.current.set(slotIndex, timeout)
  }, [slotStates])

  /**
   * 슬롯 정리 타이머 취소
   */
  const cancelSlotCleanup = useCallback((slotIndex: number): void => {
    const timeout = slotCleanupTimeoutsRef.current.get(slotIndex)
    if (timeout) {
      clearTimeout(timeout)
      slotCleanupTimeoutsRef.current.delete(slotIndex)
    }
  }, [])

  /**
   * 이미지 업로드 시 슬롯 배치 로직
   * - 1) 현재 이미지(currentImage)가 있는 슬롯이 generate 중이 아니면 교체
   * - 2) 빈 슬롯 
   * - 3) 다른 이미지 슬롯(진행 중 제외) 
   * - 4) 가장 오래된 완료 비디오
   * - 대상 슬롯을 이미지로 채우고, 상태는 empty 유지, 완료시점은 리셋
   */
  const handleImageUpload = useCallback(
    (imageUrl: string, isSlotGenerating: (slotIndex: number) => boolean, currentImage?: string | null) => {
      setSlotContents(prev => {
        let target = -1;

        // 1) 현재 이미지가 있는 슬롯을 찾아서 generate 중이 아니면 우선 교체
        if (currentImage) {
          for (let i = 0; i < 4; i++) {
            if (prev[i]?.type === "image" && 
                prev[i]?.data === currentImage && 
                !isSlotGenerating(i)) {
              target = i;
              break;
            }
          }
        }

        // 2) 빈 슬롯 우선
        if (target === -1) {
          for (let i = 0; i < 4; i++) {
            if (!prev[i]) {
              target = i;
              break;
            }
          }
        }

        // 3) 다른 이미지 슬롯 교체 (진행 중 제외)
        if (target === -1) {
          for (let i = 0; i < 4; i++) {
            if (prev[i]?.type === "image" && 
                !isSlotGenerating(i) && 
                prev[i]?.data !== currentImage) {
              target = i;
              break;
            }
          }
        }

        // 4) 비디오 슬롯 중 가장 오래된 완료를 교체
        if (target === -1) {
          const videoIndices: number[] = [];
          for (let i = 0; i < 4; i++) {
            if (prev[i]?.type === "video") videoIndices.push(i);
          }
          if (videoIndices.length > 0) {
            let idxChosen = videoIndices[0];
            let timeChosen = slotCompletedAt[idxChosen];
            for (let i = 1; i < videoIndices.length; i++) {
              const idx = videoIndices[i];
              const t = slotCompletedAt[idx];
              if (t !== null && (timeChosen === null || t < timeChosen)) {
                idxChosen = idx;
                timeChosen = t;
              }
            }
            target = idxChosen;
          }
        }

        if (target === -1) return prev;

        const newSlots = [...prev];
        newSlots[target] = { type: "image", data: imageUrl };

        // 상태와 완료시점 동기 업데이트
        setSlotStates(prevStates => {
          const next = [...prevStates];
          next[target] = "empty"; // generate 가능 상태 유지
          return next;
        });
        setSlotCompletedAt(prevTimes => {
          const next = [...prevTimes];
          next[target] = null;
          return next;
        });

        return newSlots;
      });
    },
    [slotCompletedAt]
  );

  /**
   * LeftPanel 이미지 제거 시, 동일 이미지가 슬롯에 올라와 있고 empty 상태이면 제거
   */
  const removeImageByUrlIfEmpty = useCallback((imageUrl: string) => {
    if (!imageUrl) return;
    setSlotContents(prev => {
      const newSlots = [...prev];
      for (let i = 0; i < 4; i++) {
        if (
          newSlots[i]?.type === "image" &&
          (newSlots[i]?.data as string) === imageUrl &&
          slotStates[i] === "empty"
        ) {
          newSlots[i] = null;
          setSlotStates(prevStates => {
            const next = [...prevStates];
            next[i] = "empty";
            return next;
          });
          setSlotCompletedAt(prevTimes => {
            const next = [...prevTimes];
            next[i] = null;
            return next;
          });
          break;
        }
      }
      return newSlots;
    });
  }, [slotStates]);

  /**
   * 히스토리 비디오 토글 배치
   * - 이미 있으면 제거, 없으면 우선순위 규칙에 따라 배치
   * - 모든 슬롯이 진행 중이면 false 반환
   */
  const handleVideoToggle = useCallback(
    (video: GeneratedVideo, isSlotGenerating: (slotIndex: number) => boolean): boolean => {
      // 이미 슬롯에 있는지 확인 (있으면 제거)
      const existingIndex = slotContents.findIndex(slot => slot?.type === "video" && (slot.data as GeneratedVideo).id === video.id);
      if (existingIndex !== -1) {
        setSlotContents(prev => {
          const next = [...prev];
          next[existingIndex] = null;
          return next;
        });
        setSlotStates(prev => {
          const next = [...prev];
          next[existingIndex] = "empty";
          return next;
        });
        setSlotCompletedAt(prev => {
          const next = [...prev];
          next[existingIndex] = null;
          return next;
        });
        return true;
      }

      // 배치할 슬롯 선택: 빈 → 이미지(진행중 제외) → 가장 오래된 비디오
      let targetSlot = -1;
      for (let i = 0; i < 4; i++) {
        if (!slotContents[i]) {
          targetSlot = i;
          break;
        }
      }
      if (targetSlot === -1) {
        for (let i = 0; i < 4; i++) {
          if (slotContents[i]?.type === "image" && !isSlotGenerating(i)) {
            targetSlot = i;
            break;
          }
        }
      }
      if (targetSlot === -1) {
        const videoIndices: number[] = [];
        for (let i = 0; i < 4; i++) {
          if (slotContents[i]?.type === "video") videoIndices.push(i);
        }
        if (videoIndices.length > 0) {
          let chosenIndex = videoIndices[0];
          let chosenTime = slotCompletedAt[chosenIndex];
          for (let i = 1; i < videoIndices.length; i++) {
            const idx = videoIndices[i];
            const t = slotCompletedAt[idx];
            if (t !== null && (chosenTime === null || t < chosenTime)) {
              chosenIndex = idx;
              chosenTime = t;
            }
          }
          targetSlot = chosenIndex;
        }
      }

      if (targetSlot === -1) {
        // 모든 슬롯이 진행 중이거나 배치 불가
        return false;
      }

      setSlotContents(prev => {
        const next = [...prev];
        next[targetSlot] = { type: "video", data: video };
        return next;
      });
      setSlotStates(prev => {
        const next = [...prev];
        next[targetSlot] = "completed";
        return next;
      });
      setSlotCompletedAt(prev => {
        const next = [...prev];
        next[targetSlot] = Date.now();
        return next;
      });
      
      // WeakMap에 비디오 메타데이터 추적 및 자동 정리 스케줄링
      trackVideoMetadata(video, targetSlot);
      scheduleSlotCleanup(targetSlot);
      
      return true;
    },
    [slotContents, slotCompletedAt, trackVideoMetadata, scheduleSlotCleanup]
  );

  /**
   * 슬롯 직접 선택(미리보기 활성화)
   */
  const handleSlotSelect = useCallback((index: number, video: GeneratedVideo | null) => {
    setSelectedSlotIndex(index);
    setActiveVideo(video);
  }, []);

  /**
   * 슬롯 콘텐츠 제거 (단순 비우기)
   */
  const handleRemoveContent = useCallback((index: number) => {
    // 자동 정리 타이머 취소
    cancelSlotCleanup(index);
    
    setSlotContents(prev => {
      const next = [...prev];
      next[index] = null;
      return next;
    });
    setSlotStates(prev => {
      const next = [...prev];
      next[index] = "empty";
      return next;
    });
    setSlotCompletedAt(prev => {
      const next = [...prev];
      next[index] = null;
      return next;
    });
  }, [cancelSlotCleanup]);

  /**
   * 즐겨찾기 플래그를 슬롯 내 해당 비디오에 반영
   */
  const updateVideoFavoriteFlag = useCallback((videoId: string, isFavorite: boolean) => {
    setSlotContents(prev => prev.map(slot => {
      if (slot?.type === "video" && (slot.data as GeneratedVideo).id === videoId) {
        return {
          ...slot,
          data: { ...(slot.data as GeneratedVideo), isFavorite },
        } as SlotContent;
      }
      return slot;
    }));
  }, []);

  /**
   * 생성 진입 시 사용 가능한 슬롯 탐색
   * - 1) 현재 이미지가 있는 동일 슬롯(상태 empty)
   * - 2) 완전 빈 슬롯
   * - 3) 가장 오래된 completed 슬롯
   */
  const findAvailableSlotForGeneration = useCallback((imageUrl: string | null): number => {
    if (!imageUrl) return -1;
    let available = -1;

    // 1) 동일 이미지가 있고 empty 상태인 슬롯
    for (let i = 0; i < 4; i++) {
      const slot = slotContents[i];
      if (slot?.type === "image" && slot.data === imageUrl && slotStates[i] === "empty") {
        available = i;
        break;
      }
    }

    // 2) 완전 빈 슬롯
    if (available === -1) {
      for (let i = 0; i < 4; i++) {
        if (slotStates[i] === "empty" && !slotContents[i]) {
          available = i;
          break;
        }
      }
    }

    // 3) 가장 오래된 completed 슬롯
    if (available === -1) {
      const completedIndices: number[] = [];
      for (let i = 0; i < 4; i++) {
        if (slotStates[i] === "completed") completedIndices.push(i);
      }
      if (completedIndices.length > 0) {
        let chosenIndex = completedIndices[0];
        let chosenTime = slotCompletedAt[chosenIndex];
        for (let i = 1; i < completedIndices.length; i++) {
          const idx = completedIndices[i];
          const t = slotCompletedAt[idx];
          if (t !== null && (chosenTime === null || t < chosenTime)) {
            chosenIndex = idx;
            chosenTime = t;
          }
        }
        available = chosenIndex;
      }
    }

    return available;
  }, [slotContents, slotStates, slotCompletedAt]);

  /**
   * 슬롯을 이미지로 설정 (상태/완료시점은 별도 제어)
   */
  const setSlotToImage = useCallback((slotIndex: number, imageUrl: string) => {
    setSlotContents(prev => {
      const next = [...prev];
      next[slotIndex] = { type: "image", data: imageUrl };
      return next;
    });
    
    // 슬롯 상태도 empty로 설정 (이미지만 있고 비디오는 없는 상태)
    setSlotStates(prev => {
      const next = [...prev];
      if (next[slotIndex] !== 'generating') {
        next[slotIndex] = 'empty';
      }
      return next;
    });
    
    setSlotCompletedAt(prev => {
      const next = [...prev];
      next[slotIndex] = null;
      return next;
    });
  }, []);

  /**
   * 슬롯 상태를 generating으로 설정
   */
  const markSlotGenerating = useCallback((slotIndex: number) => {
    setSlotStates(prev => {
      const next = [...prev];
      next[slotIndex] = "generating";
      return next;
    });
  }, []);

  /**
   * 비디오를 슬롯에 배치하고 completed로 설정 + 완료시점 기록
   */
  const placeVideoInSlot = useCallback((slotIndex: number, video: GeneratedVideo) => {
    setSlotContents(prev => {
      const next = [...prev];
      next[slotIndex] = { type: "video", data: video };
      return next;
    });
    setSlotStates(prev => {
      const next = [...prev];
      next[slotIndex] = "completed";
      return next;
    });
    setSlotCompletedAt(prev => {
      const next = [...prev];
      next[slotIndex] = Date.now();
      return next;
    });
    
    // WeakMap에 비디오 메타데이터 추적 및 자동 정리 스케줄링
    trackVideoMetadata(video, slotIndex);
    scheduleSlotCleanup(slotIndex);
  }, [trackVideoMetadata, scheduleSlotCleanup]);

  /**
   * 슬롯 상태를 completed로만 업데이트 (필요 시 외부에서 사용)
   */
  const markSlotCompleted = useCallback((slotIndex: number) => {
    setSlotStates(prev => {
      const next = [...prev];
      next[slotIndex] = "completed";
      return next;
    });
    setSlotCompletedAt(prev => {
      const next = [...prev];
      next[slotIndex] = Date.now();
      return next;
    });
    
    // 완료 시 자동 정리 스케줄링
    scheduleSlotCleanup(slotIndex);
  }, [scheduleSlotCleanup]);

  /**
   * 실패 시 슬롯을 초기화 (empty)
   */
  const resetSlot = useCallback((slotIndex: number) => {
    // 자동 정리 타이머 취소
    cancelSlotCleanup(slotIndex);
    
    setSlotStates(prev => {
      const next = [...prev];
      next[slotIndex] = "empty";
      return next;
    });
    setSlotContents(prev => {
      const next = [...prev];
      next[slotIndex] = null;
      return next;
    });
    setSlotCompletedAt(prev => {
      const next = [...prev];
      next[slotIndex] = null;
      return next;
    });
  }, [cancelSlotCleanup]);

  /**
   * 슬롯 상태를 직접 설정 (localStorage 복원용)
   */
  const restoreSlotStates = useCallback((state: InitialSlotState) => {
    if (state.slotContents) {
      setSlotContents(state.slotContents);
      
      // 복원된 비디오들에 대해 WeakMap 메타데이터 추적
      state.slotContents.forEach((slot, index) => {
        if (slot?.type === 'video' && typeof slot.data === 'object') {
          trackVideoMetadata(slot.data as GeneratedVideo, index);
          
          // completed 상태인 슬롯에 대해 자동 정리 스케줄링
          if (state.slotStates?.[index] === 'completed') {
            scheduleSlotCleanup(index);
          }
        }
      });
    }
    if (state.slotStates) {
      setSlotStates(state.slotStates);
    }
    if (state.slotCompletedAt) {
      setSlotCompletedAt(state.slotCompletedAt);
    }
  }, [trackVideoMetadata, scheduleSlotCleanup]);

  return {
    // 상태
    slotContents,
    slotStates,
    slotCompletedAt,
    selectedSlotIndex,
    activeVideo,

    // 선택 제어
    setSelectedSlotIndex,
    setActiveVideo,
    handleSlotSelect,

    // 이미지/비디오 배치
    handleImageUpload,
    removeImageByUrlIfEmpty,
    handleVideoToggle,
    handleRemoveContent,

    // 생성 플로우 인터페이스
    findAvailableSlotForGeneration,
    setSlotToImage,
    markSlotGenerating,
    placeVideoInSlot,
    markSlotCompleted,
    resetSlot,
    updateVideoFavoriteFlag,
    
    // 복원
    restoreSlotStates,
    
    // WeakMap 메타데이터 관리 (디버깅/모니터링용)
    getVideoMetadata,
    trackVideoMetadata,
    
    // 자동 정리 제어 (필요 시 수동 제어)
    scheduleSlotCleanup,
    cancelSlotCleanup,
  };
}

