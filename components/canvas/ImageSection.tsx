import { Play, Pause } from "lucide-react";
import Image from "next/image";

interface ImageSectionProps {
  isPlaying: boolean;
  onPlayToggle: () => void;
  images?: string[];
}

export function ImageSection({ isPlaying, onPlayToggle, images = [] }: ImageSectionProps) {
  const defaultImage = "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=100&h=100&fit=crop&crop=center";
  
  return (
    <div className="mb-4">
      <h2 className="text-sm font-medium mb-3 text-foreground">image</h2>
      <div className="grid grid-cols-4 gap-1.5">
        <button
          className="aspect-square bg-primary rounded-md flex items-center justify-center border border-primary hover:bg-primary/90 transition-colors group"
          onClick={onPlayToggle}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 text-primary-foreground" />
          ) : (
            <Play className="w-4 h-4 text-primary-foreground" />
          )}
        </button>
        <div className="aspect-square bg-surface rounded-md overflow-hidden relative">
          <Image
            src={images[0] || defaultImage}
            alt="Reference 1"
            className="w-full h-full object-cover"
            fill
            sizes="(max-width: 768px) 25vw, (max-width: 1200px) 20vw, 15vw"
          />
        </div>
        {images.slice(1, 3).map((image, index) => (
          <div key={index + 1} className="aspect-square bg-surface rounded-md overflow-hidden relative">
            <Image
              src={image}
              alt={`Reference ${index + 2}`}
              className="w-full h-full object-cover"
              fill
              sizes="(max-width: 768px) 25vw, (max-width: 1200px) 20vw, 15vw"
            />
          </div>
        ))}
      </div>
    </div>
  );
}