"use client"

import { Button } from "@/shared/components/ui/button"
import { Zap } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/shared/lib/auth/AuthContext"

interface CTASectionProps {
  texts: {
    title: {
      line1: string
      line2: string
    }
    subtitle: string
    button: string
  }
}

export function CTASection({ texts }: CTASectionProps) {
  const { user } = useAuth();
  
  return (
    <section className="py-16 sm:py-24 md:py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-black to-secondary/10" />
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center">
        <h2 className="text-3xl sm:text-4xl md:text-6xl font-bold mb-6">
          {texts.title.line1}
          <span className="block gradient-text">
            {texts.title.line2}
          </span>
        </h2>
        <p className="text-lg sm:text-xl text-gray-300 mb-8">
          {texts.subtitle}
        </p>
        <Link href={user ? "/canvas" : "/login"}>
          <Button size="lg" className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20">
            {user ? "Go to Canvas" : texts.button}
            <Zap className="ml-2 w-4 h-4" />
          </Button>
        </Link>
      </div>
    </section>
  )
}