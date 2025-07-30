import { Check } from "lucide-react"
import { Zap, Palette, Sparkles } from "lucide-react"

interface Feature {
  title: string
  description: string
  examples: string[]
}

interface FeaturesSectionProps {
  texts: {
    title: string
    subtitle: string
    items: Feature[]
  }
}

const iconMap = {
  0: Zap,
  1: Palette,
  2: Sparkles
}

const colorMap = {
  0: "bg-gradient-to-br from-primary to-primary/80",
  1: "bg-gradient-to-br from-secondary to-secondary/80",
  2: "bg-gradient-to-br from-primary to-secondary"
}

export function FeaturesSection({ texts }: FeaturesSectionProps) {
  return (
    <section id="features" className="py-16 sm:py-24 md:py-32 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
            {texts.title}
          </h2>
          <p className="text-lg sm:text-xl text-gray-400">
            {texts.subtitle}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {texts.items.map((feature, index) => {
            const Icon = iconMap[index as keyof typeof iconMap]
            const color = colorMap[index as keyof typeof colorMap]
            
            return (
              <div
                key={index}
                className="group relative bg-gradient-to-br from-gray-900 to-gray-950 p-6 sm:p-8 rounded-2xl border border-gray-800 hover:border-primary/50 transition-all duration-300"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className={`relative z-10 w-12 h-12 mb-6 rounded-xl ${color} flex items-center justify-center`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
                
                <div className="mt-6 space-y-2">
                  {feature.examples.map((example, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-gray-500">
                      <Check className="w-4 h-4 text-primary flex-shrink-0" />
                      <span>{example}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}