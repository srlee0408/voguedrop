'use client';

import { useEffect, useMemo, useState } from 'react';

interface PreviewClip {
  id: string;
  thumbnail?: string;
  url?: string;
  duration: number;
  thumbnails: number;
}

interface VideoPreviewProps {
  clips: PreviewClip[];
  onRemoveClip?: (id: string) => void;
}

export default function VideoPreview({ clips, onRemoveClip }: VideoPreviewProps) {
  // SSR-CSR hydration 안정화를 위한 마운트 플래그
  const [is_mounted, setIsMounted] = useState(false);
  // 선택된 프리뷰 대상 클립 ID 관리
  const [selected_preview_clip_id, setSelectedPreviewClipId] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 초기/클립 변경 시 기본 선택: 첫 번째 클립
  useEffect(() => {
    if (clips.length === 0) {
      setSelectedPreviewClipId(null);
    } else if (!selected_preview_clip_id || !clips.some(c => c.id === selected_preview_clip_id)) {
      setSelectedPreviewClipId(clips[0].id);
    }
  }, [clips, selected_preview_clip_id]);

  const selected_clip = useMemo(() => clips.find(c => c.id === selected_preview_clip_id) || null, [clips, selected_preview_clip_id]);

  // 앞의 4칸은 클립 슬롯, 5번째 칸은 프리뷰 플레이어
  const clip_slots = clips.slice(0, 4);
  const empty_slot_count = Math.max(0, 4 - clip_slots.length);

  if (!is_mounted) return null;

  return (
    <div className="flex-1 px-4 bg-black flex items-center">
      <div className="grid grid-cols-5 gap-3 w-full h-full py-4">
        {/* 1~4번 동일 크기 슬롯 */}
        {clip_slots.map((clip) => (
          <div key={clip.id} className="bg-gray-800 rounded-lg overflow-hidden h-full">
            <div
              role="button"
              tabIndex={0}
              className="relative w-full h-full text-left cursor-pointer"
              onClick={() => setSelectedPreviewClipId(clip.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelectedPreviewClipId(clip.id);
                }
              }}
            >
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: clip.thumbnail ? `url('${clip.thumbnail}')` : undefined }}
              />
              {/* 선택 표시 */}
              <div className={`absolute inset-0 ring-2 ${selected_preview_clip_id === clip.id ? 'ring-[#38f47cf9]' : 'ring-transparent'}`} />
              {/* 삭제 버튼 */}
              {onRemoveClip && (
                <div className="absolute bottom-2 right-2">
                  <div
                    role="button"
                    tabIndex={0}
                    className="w-7 h-7 flex items-center justify-center bg-black/40 hover:bg-black/60 rounded"
                    onClick={(e) => { e.stopPropagation(); onRemoveClip(clip.id); }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        onRemoveClip(clip.id);
                      }
                    }}
                    aria-label="Remove clip"
                  >
                    <i className="ri-delete-bin-line text-white text-xs"></i>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* 빈 슬롯들로 4칸 채우기 */}
        {Array.from({ length: empty_slot_count }).map((_, idx) => (
          <div key={`empty-${idx}`} className="bg-gray-800/40 rounded-lg h-full border-2 border-dashed border-gray-700 flex items-center justify-center text-gray-500 text-sm">
            Empty
          </div>
        ))}

        {/* 5번째: 미리보기 플레이어 */}
        <div className="bg-gray-900 rounded-lg overflow-hidden h-full relative">
          <div className="absolute top-2 left-2 bg-black/50 px-2 py-1 rounded text-xs font-medium">Preview</div>
          <div className="w-full h-full flex items-center justify-center bg-black">
            {selected_clip?.url ? (
              <video
                className="max-h-full max-w-full"
                src={selected_clip.url}
                controls
              />
            ) : selected_clip?.thumbnail ? (
              <div
                className="w-full h-full bg-cover bg-center"
                style={{ backgroundImage: `url('${selected_clip.thumbnail}')` }}
              />
            ) : (
              <div className="text-gray-500 text-sm">No clip selected</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}