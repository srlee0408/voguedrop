import { HeroSection } from "./(home)/_components/HeroSection"
import { FeaturesSection } from "./(home)/_components/FeaturesSection"
import { HowItWorksSection } from "./(home)/_components/HowItWorksSection"
import { GallerySection } from "./(home)/_components/GallerySection"
import { CTASection } from "./(home)/_components/CTASection"
import { Footer } from "./(home)/_components/Footer"
import homeTexts from "@/locales/en/home.json"

export const dynamic = 'force-dynamic'
export const revalidate = 0

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