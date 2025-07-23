import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ArrowRight, Sparkles, Play, ChevronDown } from "lucide-react"
import Link from "next/link"

interface HeroSectionProps {
  texts: {
    badge: string
    title: {
      line1: string
      line2: string
    }
    description: string
    cta: {
      primary: string
      secondary: string
    }
  }
}

export function HeroSection({ texts }: HeroSectionProps) {
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-black to-secondary/10" />
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-72 h-72 bg-primary/20 rounded-full filter blur-[100px] animate-pulse" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-secondary/20 rounded-full filter blur-[120px] animate-pulse" />
      </div>

      {/* Header */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-black/80 backdrop-blur-md' : ''}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="font-sans text-xl sm:text-2xl font-bold text-primary tracking-tight">
              vogue drop
            </div>
            <nav className="hidden md:flex items-center gap-8">
              <Link href="#features" className="text-gray-300 hover:text-white transition-colors">Features</Link>
              <Link href="#how-it-works" className="text-gray-300 hover:text-white transition-colors">How it Works</Link>
              <Link href="#gallery" className="text-gray-300 hover:text-white transition-colors">Gallery</Link>
              <Link href="#pricing" className="text-gray-300 hover:text-white transition-colors">Pricing</Link>
              <Link href="/canvas">
                <Button className="bg-primary hover:bg-primary/90 text-white">
                  Get Started
                </Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="text-center lg:text-left">
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold mb-8 leading-tight text-white">
              {texts.title.line1}
              <span className="block gradient-text">
                {texts.title.line2}
              </span>
            </h1>
            
            <p className="text-lg sm:text-xl text-gray-400 mb-12 max-w-xl">
              {texts.description}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link href="/canvas">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-white group w-full sm:w-auto shadow-lg shadow-primary/20 px-8 py-4 text-lg font-semibold">
                  {texts.cta.primary}
                  <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="border-white/20 hover:bg-white/10 w-full sm:w-auto px-8 py-4 text-lg font-semibold">
                <Play className="mr-2 w-4 h-4" />
                {texts.cta.secondary}
              </Button>
            </div>
          </div>
          
          <div className="flex gap-6 justify-center lg:justify-end">
            <div className="relative hero-image rounded-3xl aspect-[9/16] w-[200px] sm:w-[240px] lg:w-[280px] overflow-hidden animate-float">
              <img 
                src="https://static.readdy.ai/image/6f7165cfe0b25edc582c9815e9f0cfd2/ffb51a9f9b523f1e494aea016a7d2899.png" 
                alt="Fashion AI" 
                className="w-full h-full object-cover rounded-3xl"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent rounded-3xl"></div>
            </div>
            <div className="relative hero-image rounded-3xl aspect-[9/16] w-[200px] sm:w-[240px] lg:w-[280px] overflow-hidden animate-float-reverse">
              <img 
                src="https://static.readdy.ai/image/6f7165cfe0b25edc582c9815e9f0cfd2/a0eb3ad9c81f7aa80d8355d320ea7e96.png" 
                alt="Fashion AI" 
                className="w-full h-full object-cover rounded-3xl scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent rounded-3xl"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}