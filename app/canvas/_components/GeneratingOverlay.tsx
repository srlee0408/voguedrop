import { Loader2 } from "lucide-react";

interface GeneratingOverlayProps {
  isGenerating: boolean;
  message?: string;
}

export function GeneratingOverlay({ 
  isGenerating, 
  message = "Generating video..." 
}: GeneratingOverlayProps) {
  if (!isGenerating) return null;

  return (
    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center z-50 rounded-lg">
      <div className="flex flex-col items-center gap-4">
        {/* 로딩 애니메이션 */}
        <div className="relative">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <div className="absolute inset-0 w-12 h-12 rounded-full border-4 border-primary/20" />
        </div>
        
        {/* 메시지 */}
        <div className="text-center space-y-2">
          <p className="text-sm font-medium text-foreground">
            {message}
          </p>
          <p className="text-xs text-muted-foreground">
            Takes about 30-60 seconds
          </p>
        </div>

        {/* 프로그레스 바 (옵션) */}
        <div className="w-48 h-1 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: '60%' }} />
        </div>
      </div>
    </div>
  );
}