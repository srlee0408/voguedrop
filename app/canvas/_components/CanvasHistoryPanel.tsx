import { Play, Clock, Loader2 } from "lucide-react";
import Image from "next/image";
import { formatRelativeTime } from "@/lib/utils/session";
import type { GeneratedVideo } from "@/types/canvas";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { createClient } from "@/lib/supabase/client";
import type { VideoGeneration } from "@/lib/db/video-generations";

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

  // Fetch user's video history from database
  useEffect(() => {
    async function fetchVideoHistory() {
      try {
        if (!user) {
          console.log('No authenticated user');
          setDbVideos([]);
          setIsLoading(false);
          return;
        }
        
        const supabase = createClient();
        const { data: videos, error } = await supabase
          .from('video_generations')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) {
          console.error('Failed to fetch videos:', error);
          return;
        }
        
        // Convert DB format to GeneratedVideo format
        const convertedVideos: GeneratedVideo[] = (videos || [])
          .filter((v: VideoGeneration) => v.status === 'completed' && v.output_video_url && v.job_id)
          .map((v: VideoGeneration) => ({
            id: v.job_id!,  // job_id를 ID로 사용
            url: v.output_video_url!,
            createdAt: new Date(v.created_at),
            thumbnail: v.input_image_url,
            modelType: v.model_type,
            isFavorite: v.is_favorite || false
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