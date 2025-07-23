import { Play } from "lucide-react"

interface GalleryItem {
  title: string
  type: string
}

interface GallerySectionProps {
  texts: {
    title: string
    subtitle: string
    items: GalleryItem[]
  }
}

export function GallerySection({ texts }: GallerySectionProps) {
  return (
    <section id="gallery" className="py-16 sm:py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
            {texts.title}
          </h2>
          <p className="text-lg sm:text-xl text-gray-400">
            {texts.subtitle}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {texts.items.map((item, index) => (
            <div
              key={index}
              className="group relative aspect-[9/16] bg-gray-900 rounded-lg overflow-hidden cursor-pointer"
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10" />
              <div className="absolute bottom-2 sm:bottom-4 left-2 sm:left-4 right-2 sm:right-4 z-20">
                <h3 className="font-semibold mb-1 text-sm sm:text-base">{item.title}</h3>
                <p className="text-xs sm:text-sm text-gray-300">{item.type}</p>
              </div>
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-30">
                <div className="w-12 sm:w-16 h-12 sm:h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                  <Play className="w-5 sm:w-6 h-5 sm:h-6 ml-1" />
                </div>
              </div>
              <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20" />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}