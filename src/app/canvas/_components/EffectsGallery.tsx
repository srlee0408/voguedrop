/**
 * EffectsGallery - AI 효과 갤러리 컴포넌트
 * 
 * 주요 역할:
 * 1. 카테고리별 대표 효과들을 원형 썸네일로 표시
 * 2. 효과 선택 시 상세 효과 모달로 전환하는 진입점
 * 3. 로딩 및 에러 상태에 대한 적절한 UI 피드백
 * 4. 호버 시 효과 미리보기 영상 재생
 * 
 * 핵심 특징:
 * - 3열 그리드 레이아웃으로 효과 카테고리 표시
 * - 각 효과는 원형 썸네일과 호버 비디오 지원
 * - 로딩 중에는 스켈레톤 UI 표시
 * - 에러 발생 시 사용자 친화적인 에러 메시지
 * 
 * 주의사항:
 * - useEffectsData 훅에서 대표 효과 데이터 가져오기
 * - 효과 클릭 시 상위 컴포넌트의 모달 상태 변경
 * - 비동기 데이터 로딩 상태 관리 중요
 */
import { useEffectsData } from "@/app/canvas/_hooks/useEffectsData";
import { HoverVideo } from "@/shared/components/ui/hover-video";

interface EffectsGalleryProps {
  onEffectClick?: () => void;
}

export function EffectsGallery({ onEffectClick }: EffectsGalleryProps) {
  const { getRepresentativeEffects, isLoading, error } = useEffectsData();
  const representativeEffects = getRepresentativeEffects();

  if (isLoading) {
    return (
      <div className="mb-4">
        <h2 className="text-sm font-medium mb-3 text-foreground">Effect Category</h2>
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="aspect-square rounded-full bg-surface animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-4">
        <h2 className="text-sm font-medium mb-3 text-foreground">Effect Category</h2>
        <div className="text-sm text-destructive">{error}</div>
      </div>
    );
  }

  return (
    <div className="mb-4">
      <h2 className="text-sm font-medium mb-3 text-foreground">Effect Category</h2>
      <div className="grid grid-cols-3 gap-2">
        {representativeEffects.map((effect) => (
          <div key={effect.id} className="flex flex-col gap-1">
            <button
              onClick={onEffectClick}
              className="aspect-square rounded-full overflow-hidden relative group hover:ring-2 hover:ring-primary transition-all cursor-pointer"
            >
              {effect.previewUrl ? (
                <HoverVideo
                  src={effect.previewUrl}
                  className="w-full h-full object-cover"
                  showMode="video-first"
                  pauseMode="pause"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
                  <span className="text-white text-[10px] font-medium px-1 text-center">{effect.name}</span>
                </div>
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-full" />
            </button>
            <p className="text-[10px] text-muted-foreground text-center capitalize">
              {effect.category.name}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}