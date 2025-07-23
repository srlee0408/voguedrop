interface QuickAction {
  id: string;
  label: string;
  image: string;
  onClick: () => void;
}

interface QuickActionsBarProps {
  actions?: QuickAction[];
  onEffectClick?: () => void;
  onCameraClick?: () => void;
  onModelClick?: () => void;
}

export function QuickActionsBar({
  actions,
  onEffectClick,
  onCameraClick,
  onModelClick,
}: QuickActionsBarProps) {
  const defaultActions: QuickAction[] = actions || [
    {
      id: "effect",
      label: "Effect",
      image: "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=48&h=48&fit=crop",
      onClick: onEffectClick || (() => {}),
    },
    {
      id: "camera",
      label: "Camera Angle",
      image: "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=48&h=48&fit=crop",
      onClick: onCameraClick || (() => {}),
    },
    {
      id: "model",
      label: "Model",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=48&h=48&fit=crop",
      onClick: onModelClick || (() => {}),
    },
  ];

  return (
    <div className="flex justify-between mt-4 px-2">
      {defaultActions.map((action) => (
        <button
          key={action.id}
          className="flex flex-col items-center gap-2 group"
          onClick={action.onClick}
          aria-label={action.label}
        >
          <div className="w-12 h-12 rounded-lg overflow-hidden ring-0 ring-primary transition-all group-hover:ring-2">
            <img
              src={action.image}
              alt={action.label}
              className="w-full h-full object-cover"
            />
          </div>
          <span className="text-xs text-foreground">{action.label}</span>
        </button>
      ))}
    </div>
  );
}