"use client"

import { HeroSection } from "@/components/home/HeroSection"
import { FeaturesSection } from "@/components/home/FeaturesSection"
import { HowItWorksSection } from "@/components/home/HowItWorksSection"
import { GallerySection } from "@/components/home/GallerySection"
import { CTASection } from "@/components/home/CTASection"
import { Footer } from "@/components/home/Footer"
import homeTexts from "@/locales/ko/home.json"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <HeroSection texts={homeTexts.hero} />
      <FeaturesSection texts={homeTexts.features} />
      <HowItWorksSection texts={homeTexts.howItWorks} />
      <GallerySection texts={homeTexts.gallery} />
      <CTASection texts={homeTexts.cta} />
      <Footer texts={homeTexts.footer} />
    </div>
  )
}