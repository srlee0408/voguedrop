import { useCallback, useState } from "react";
import type { GeneratedVideo } from "@/types/canvas";

type SlotContent = { type: "image" | "video"; data: string | GeneratedVideo } | null;

/**
 * Canvas 슬롯 상태와 배치 규칙을 관리하는 훅
 * - 4개 슬롯의 콘텐츠/상태/완료시점을 관리
 * - 이미지 업로드/제거, 히스토리 비디오 토글 배치, 슬롯 선택 등의 로직 캡슐화
 */
export function useSlotManager() {
  const [slotContents, setSlotContents] = useState<Array<SlotContent>>([
    null,
    null,
    null,
    null,
  ]);
  const [slotStates, setSlotStates] = useState<Array<"empty" | "generating" | "completed">>([
    "empty",
    "empty",
    "empty",
    "empty",
  ]);
  const [slotCompletedAt, setSlotCompletedAt] = useState<Array<number | null>>([
    null,
    null,
    null,
    null,
  ]);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);
  const [activeVideo, setActiveVideo] = useState<GeneratedVideo | null>(null);

  /**
   * 이미지 업로드 시 슬롯 배치 로직
   * - 1) 빈 슬롯 → 2) 이미지 슬롯(진행 중 제외) → 3) 가장 오래된 완료 비디오
   * - 대상 슬롯을 이미지로 채우고, 상태는 empty 유지, 완료시점은 리셋
   */
  const handleImageUpload = useCallback(
    (imageUrl: string, isSlotGenerating: (slotIndex: number) => boolean) => {
      setSlotContents(prev => {
        let target = -1;

        // 1) 빈 슬롯 우선
        for (let i = 0; i < 4; i++) {
          if (!prev[i]) {
            target = i;
            break;
          }
        }

        // 2) 이미지 슬롯 교체 (진행 중 제외)
        if (target === -1) {
          for (let i = 0; i < 4; i++) {
            if (prev[i]?.type === "image" && !isSlotGenerating(i)) {
              target = i;
              break;
            }
          }
        }

        // 3) 비디오 슬롯 중 가장 오래된 완료를 교체
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
      return true;
    },
    [slotContents, slotCompletedAt]
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
  }, []);

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
  }, []);

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
  }, []);

  /**
   * 실패 시 슬롯을 초기화 (empty)
   */
  const resetSlot = useCallback((slotIndex: number) => {
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
  }, []);

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
  };
}

