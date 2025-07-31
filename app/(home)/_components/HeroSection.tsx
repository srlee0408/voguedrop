"use client"

import { Button } from "@/components/ui/button";
import { ArrowRight, Play } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { HomeHeader } from "./HomeHeader";
import { BackgroundEffects } from "./BackgroundEffects";
import { useAuth } from "@/lib/auth/AuthContext";

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
  const { user } = useAuth();
  
  return (
    <>
      <HomeHeader texts={{ login: "Login", getStarted: "Get Started" }} />
      
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <BackgroundEffects />

      {/* Hero Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="text-center lg:text-left">
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold mb-8 leading-tight text-foreground">
              {texts.title.line1}
              <span className="block gradient-text">
                {texts.title.line2}
              </span>
            </h1>
            
            <p className="text-lg sm:text-xl text-text-secondary mb-12 max-w-xl">
              {texts.description}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link href={user ? "/canvas" : "/login"}>
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground group w-full sm:w-auto shadow-lg shadow-primary/20 px-8 py-4 text-lg font-semibold">
                  {user ? "Go to Canvas" : texts.cta.primary}
                  <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="border-border hover:bg-surface/10 w-full sm:w-auto px-8 py-4 text-lg font-semibold">
                <Play className="mr-2 w-4 h-4" />
                {texts.cta.secondary}
              </Button>
            </div>
          </div>
          
          <div className="flex gap-6 justify-center lg:justify-end">
            <div className="relative hero-image rounded-3xl aspect-[9/16] w-[200px] sm:w-[240px] lg:w-[280px] overflow-hidden animate-float">
              <Image 
                src="https://static.readdy.ai/image/6f7165cfe0b25edc582c9815e9f0cfd2/ffb51a9f9b523f1e494aea016a7d2899.png" 
                alt="Fashion AI" 
                className="w-full h-full object-cover rounded-3xl"
                fill
                sizes="(max-width: 640px) 200px, (max-width: 1024px) 240px, 280px"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/50 to-transparent rounded-3xl"></div>
            </div>
            <div className="relative hero-image rounded-3xl aspect-[9/16] w-[200px] sm:w-[240px] lg:w-[280px] overflow-hidden animate-float-reverse">
              <Image 
                src="https://static.readdy.ai/image/6f7165cfe0b25edc582c9815e9f0cfd2/a0eb3ad9c81f7aa80d8355d320ea7e96.png" 
                alt="Fashion AI" 
                className="w-full h-full object-cover rounded-3xl scale-110"
                fill
                sizes="(max-width: 640px) 200px, (max-width: 1024px) 240px, 280px"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/50 to-transparent rounded-3xl"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
    </>
  );
}