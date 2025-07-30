import { Play, Clock } from "lucide-react";
import Image from "next/image";
import { formatRelativeTime } from "@/lib/utils/session";
import type { GeneratedVideo } from "@/types/canvas";

interface CanvasHistoryPanelProps {
  generatedVideos: GeneratedVideo[];
  selectedVideoId?: number | null;
  onVideoSelect?: (video: GeneratedVideo) => void;
}

export function CanvasHistoryPanel({
  generatedVideos,
  selectedVideoId,
  onVideoSelect,
}: CanvasHistoryPanelProps) {
  return (
    <div className="w-24 flex flex-col items-center space-y-2 ml-4">
      {/* History Title */}
      <div className="text-xs text-muted-foreground mb-1">
        History
      </div>
      
      {/* Generated Videos */}
      {generatedVideos.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-xs text-muted-foreground">No videos yet</p>
        </div>
      ) : (
        generatedVideos.map((video) => (
          <button
            key={video.id}
            onClick={() => onVideoSelect?.(video)}
            className={`relative w-20 h-20 bg-surface/10 rounded-md overflow-hidden transition-all group ${
              video.id === selectedVideoId
                ? "border-2 border-primary"
                : "border border-transparent hover:border-border"
            }`}
            aria-label={`Select video ${video.id}`}
          >
            {video.thumbnail ? (
              <>
                <Image
                  src={video.thumbnail}
                  alt={`Video thumbnail ${video.id}`}
                  className="w-full h-full object-cover"
                  fill
                  sizes="80px"
                />
                {/* Play overlay on hover */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Play className="w-6 h-6 text-white fill-white" />
                </div>
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted">
                <Play className="w-8 h-8 text-muted-foreground" />
              </div>
            )}
            
            {/* Time indicator */}
            <div className="absolute bottom-1 right-1 bg-black/60 px-1 py-0.5 rounded text-xs text-white flex items-center gap-0.5">
              <Clock className="w-2.5 h-2.5" />
              <span className="text-[10px]">
                {formatRelativeTime(video.createdAt.toISOString())}
              </span>
            </div>
          </button>
        ))
      )}
    </div>
  );
}