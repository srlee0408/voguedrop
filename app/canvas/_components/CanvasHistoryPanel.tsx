import { Play, Clock, Loader2 } from "lucide-react";
import Image from "next/image";
import { formatRelativeTime } from "@/lib/utils/session";
import type { GeneratedVideo } from "@/types/canvas";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";

interface CanvasHistoryPanelProps {
  generatedVideos: GeneratedVideo[];
  onVideoSelect?: (video: GeneratedVideo) => void;
  selectedHistoryVideos?: GeneratedVideo[];
}

export function CanvasHistoryPanel({
  generatedVideos,
  onVideoSelect,
  selectedHistoryVideos = [],
}: CanvasHistoryPanelProps) {
  const [dbVideos, setDbVideos] = useState<GeneratedVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  // Fetch user's video history from API
  useEffect(() => {
    async function fetchVideoHistory() {
      try {
        if (!user) {
          console.log('No authenticated user');
          setDbVideos([]);
          setIsLoading(false);
          return;
        }
        
        // API 호출로 변경
        const response = await fetch('/api/canvas/history?limit=50');
        if (!response.ok) {
          throw new Error('Failed to fetch video history');
        }
        
        const data = await response.json();
        
        // API 응답 형식을 GeneratedVideo 형식으로 변환
        const convertedVideos: GeneratedVideo[] = (data.videos || [])
          .map((v: {id: string; videoUrl: string; createdAt: string; thumbnail: string; isFavorite: boolean}) => ({
            id: v.id,
            url: v.videoUrl,
            createdAt: new Date(v.createdAt),
            thumbnail: v.thumbnail,
            isFavorite: v.isFavorite || false
          }));
        
        setDbVideos(convertedVideos);
      } catch (error) {
        console.error('Failed to fetch video history:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchVideoHistory();
  }, [user, generatedVideos]); // Re-fetch when user or new videos change
  return (
    <div className="w-24 flex flex-col items-center space-y-2 ml-4">
      {/* History Title */}
      <div className="text-xs text-muted-foreground mb-1">
        History
      </div>
      
      {/* Generated Videos */}
      {isLoading ? (
        <div className="text-center py-4">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground mx-auto" />
          <p className="text-xs text-muted-foreground mt-2">Loading...</p>
        </div>
      ) : dbVideos.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-xs text-muted-foreground">No videos yet</p>
        </div>
      ) : (
        dbVideos.slice(0,4).map((video) => (
          <button
            key={video.id}
            onClick={() => onVideoSelect?.(video)}
            className={`relative w-20 h-20 bg-surface/10 rounded-md overflow-hidden transition-all group ${
              selectedHistoryVideos.some(v => v.id === video.id)
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