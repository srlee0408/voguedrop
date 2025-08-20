import { HeroSection } from "./(home)/_components/HeroSection"
import { FeaturesSection } from "./(home)/_components/FeaturesSection"
import { HowItWorksSection } from "./(home)/_components/HowItWorksSection"
import { GallerySection } from "./(home)/_components/GallerySection"
import { CTASection } from "./(home)/_components/CTASection"
import { Footer } from "./(home)/_components/Footer"
import homeTexts from "@/locales/en/home.json"

// ISR (Incremental Static Regeneration) 설정
// 60초마다 백그라운드에서 페이지를 재생성하여 데이터를 업데이트
export const revalidate = 60

export default function HomePage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <HeroSection texts={homeTexts.hero} />
      <FeaturesSection texts={homeTexts.features} />
      <HowItWorksSection />
      <GallerySection texts={homeTexts.gallery} />
      <CTASection texts={homeTexts.cta} />
      <Footer texts={homeTexts.footer} />
    </div>
  )
}