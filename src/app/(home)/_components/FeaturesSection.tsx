/**
 * FeaturesSection - 제품 주요 기능 소개 섹션 컴포넌트
 * 
 * 주요 역할:
 * 1. VogueDrop의 핵심 기능들을 시각적으로 소개
 * 2. 각 기능별 아이콘, 설명, 스크린샷 제공
 * 3. 그리드 레이아웃으로 정돈된 정보 전달
 * 4. 다국어 지원을 위한 텍스트 구조화
 * 
 * 핵심 특징:
 * - 동적 아이콘 매핑으로 유연한 아이콘 선택
 * - 기능별 컬러 테마로 시각적 구분
 * - 반응형 그리드 레이아웃 (1열 → 2열 → 3열)
 * - 각 기능의 스크린샷으로 직관적 이해 지원
 * 
 * 주의사항:
 * - iconMap에 정의된 아이콘만 사용 가능
 * - 이미지 경로 확인 및 최적화 필요
 * - 기능 추가 시 iconColors 배열도 확장 고려
 */
import Image from "next/image"
import { Target, Film, Circle, Monitor, Volume2, Sparkles } from "lucide-react"

interface Feature {
  title: string
  description: string
  image: string
  icon: string
}

interface FeaturesSectionProps {
  texts: {
    title: string
    subtitle: string
    tagline?: string
    items: Feature[]
  }
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  target: Target,
  film: Film,
  circle: Circle,
  monitor: Monitor,
  volume: Volume2,
  sparkles: Sparkles
}

const iconColors = [
  "status-success",
  "status-info", 
  "status-warning",
  "bg-purple-500/20 text-purple-400",
  "bg-pink-500/20 text-pink-400",
  "bg-indigo-500/20 text-indigo-400"
]

export function FeaturesSection({ texts }: FeaturesSectionProps) {
  return (
    <section id="features" className="py-16 sm:py-24 md:py-32 relative bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Film className="w-6 h-6 text-gray-400" />
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold">
              {texts.title}
            </h2>
          </div>
          <p className="text-lg sm:text-xl text-gray-300 max-w-3xl mx-auto">
            {texts.subtitle}
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-3 mb-12">
          <div className="flex-center gap-2 px-4 py-2 bg-gray-800/50 rounded-full">
            <Target className="w-4 h-4 text-green-400" />
            <span className="text-body text-gray-300">Zooms & Pans</span>
          </div>
          <div className="flex-center gap-2 px-4 py-2 bg-gray-800/50 rounded-full">
            <Film className="w-4 h-4 text-blue-400" />
            <span className="text-body text-gray-300">Retro Filters</span>
          </div>
          <div className="flex-center gap-2 px-4 py-2 bg-gray-800/50 rounded-full">
            <Volume2 className="w-4 h-4 text-purple-400" />
            <span className="text-body text-gray-300">AI Sound</span>
          </div>
        </div>

        {texts.tagline && (
          <p className="text-center text-body-secondary mb-12">
            {texts.tagline}
          </p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {texts.items.map((feature, index) => {
            const Icon = iconMap[feature.icon] || Sparkles
            const iconColorClass = iconColors[index] || iconColors[0]
            
            return (
              <div
                key={index}
                className="group relative surface-card hover:border-gray-700 hover:shadow-2xl hover:shadow-white/5 hover-lift transition-all duration-300 overflow-hidden"
              >
                <div className="p-6">
                  <div className={`w-10 h-10 rounded-lg ${iconColorClass} flex-center mb-4`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  
                  <h3 className="text-heading-2 mb-2 text-white">
                    {feature.title}
                  </h3>
                  <p className="text-body-secondary mb-4">
                    {feature.description}
                  </p>
                </div>
                
                <div className="px-6 pb-6">
                  <div className="relative h-48 w-full overflow-hidden rounded-2xl">
                    <Image
                      src={feature.image}
                      alt={feature.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}