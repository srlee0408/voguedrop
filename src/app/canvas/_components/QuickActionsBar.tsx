interface QuickActionsBarProps {
  onGenerateClick?: () => void;
  isGenerating?: boolean;
  onMergeClick?: () => void;
}

export function QuickActionsBar({
  onGenerateClick,
  isGenerating,
  onMergeClick,
}: QuickActionsBarProps) {
  return (
    <div className="mt-auto space-y-2">
      <button
        onClick={onGenerateClick}
        disabled={isGenerating}
        className="w-full py-2.5 px-4 bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-primary-foreground rounded-md font-medium text-sm transition-colors"
      >
        {isGenerating ? 'Generating...' : 'Generate'}
      </button>
      
      <button
        onClick={onMergeClick}
        className="w-full py-2.5 px-4 bg-muted hover:bg-muted/80 text-foreground rounded-md font-medium text-sm transition-colors"
      >
        Merge
      </button>
    </div>
  );
}