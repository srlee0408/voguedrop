import { Upload, Palette, Settings, Video, Share2 } from "lucide-react"

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-16 sm:py-24 md:py-32 bg-gray-950">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 sm:mb-16">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Settings className="w-8 h-8 text-primary" />
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold">
              AI-Powered Workflow
            </h2>
          </div>
          <p className="text-lg sm:text-xl text-gray-400">
            Create stunning videos in minutes. No timeline. Just results.
          </p>
        </div>

        <div className="relative w-full">
          {/* Vertical connecting line */}
          <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary to-secondary -translate-x-1/2" />
          
          {/* Workflow steps */}
          <div className="space-y-2 md:-space-y-10">
            {[
              { title: "Upload Images", description: "Upload your lookbook or photo shoot images to get started", icon: Upload },
              { title: "Choose Video Style", description: "Select from our curated collection of professional video styles", icon: Palette },
              { title: "AI Magic", description: "AI automatically adds sound effects and edits your video", icon: Video },
              { title: "Share & Go Viral", description: "Download or directly share to TikTok, Reels, and Shorts", icon: Share2 }
            ].map((step, index) => {
              const Icon = step.icon
              const isEven = index % 2 === 0
              
              return (
                <div key={index} className={`relative flex ${isEven ? 'justify-start' : 'justify-end'} lg:px-20 xl:px-32`}>
                  {/* Card */}
                  <div className={`relative w-full md:w-2/5 lg:w-5/12 ${isEven ? 'md:mr-auto' : 'md:ml-auto'}`}>
                    {/* Connection dot - positioned at card edge */}
                    <div className={`hidden md:block absolute top-1/2 w-4 h-4 bg-primary rounded-full -translate-y-1/2 z-10 ${isEven ? '-right-2' : '-left-2'}`} />
                    <div className="surface-card p-6 sm:p-8">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-14 h-14 bg-primary rounded-xl flex-center">
                          <Icon className="w-7 h-7 text-white" />
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-medium text-primary">Step {index + 1}</span>
                            <h3 className="text-heading-2 text-white">{step.title}</h3>
                          </div>
                          <p className="text-body-secondary">{step.description}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}