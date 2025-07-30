import { Upload, Palette, Download } from "lucide-react"

interface Step {
  title: string
  description: string
}

interface HowItWorksSectionProps {
  texts: {
    title: string
    subtitle: string
    steps: Step[]
  }
}

const iconMap = {
  0: Upload,
  1: Palette,
  2: Download
}

export function HowItWorksSection({ texts }: HowItWorksSectionProps) {
  return (
    <section id="how-it-works" className="py-16 sm:py-24 md:py-32 bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
            {texts.title}
          </h2>
          <p className="text-lg sm:text-xl text-gray-400">
            {texts.subtitle}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
          {texts.steps.map((step, index) => {
            const Icon = iconMap[index as keyof typeof iconMap]
            
            return (
              <div key={index} className="relative">
                {index < texts.steps.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 left-full w-full h-0.5 bg-gradient-to-r from-primary to-secondary -translate-y-1/2" />
                )}
                
                <div className="bg-black border border-gray-800 rounded-2xl p-6 sm:p-8 relative">
                  <div className="absolute -top-4 left-6 sm:left-8 gradient-bg text-white w-8 h-8 rounded-full flex items-center justify-center font-bold">
                    {index + 1}
                  </div>
                  
                  <div className="w-12 h-12 mb-6 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  
                  <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                  <p className="text-gray-400">{step.description}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}