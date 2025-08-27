"use client"

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/shared/components/ui/button";
import { useAuth } from "@/features/user-auth/_context/AuthContext";

interface HomeHeaderProps {
  texts?: {
    login: string;
    getStarted: string;
  };
}

export function HomeHeader({ texts = { login: "Login", getStarted: "Get Started" } }: HomeHeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const { user, signOut } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? "bg-background/80 backdrop-blur-md" : ""
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          <Link 
            href="/" 
            className="font-sans text-xl sm:text-2xl font-bold text-primary tracking-tight hover:opacity-80 transition-opacity"
          >
            vogue drop
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <Link
              href="/#features"
              className="text-text-secondary hover:text-text-primary transition-colors"
            >
              Features
            </Link>
            <Link
              href="/#how-it-works"
              className="text-text-secondary hover:text-text-primary transition-colors"
            >
              How it Works
            </Link>
            <Link
              href="/gallery"
              className="text-text-secondary hover:text-text-primary transition-colors"
            >
              Gallery
            </Link>
            <Link
              href="/canvas"
              className="text-text-secondary hover:text-text-primary transition-colors"
            >
              Canvas
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <Button 
                  variant="ghost" 
                  className="text-text-secondary hover:text-text-primary"
                  onClick={async () => {
                    await signOut()
                  }}
                >
                  Logout
                </Button>
                <Link href="/canvas">
                  <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                    Go to Canvas
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" className="text-text-secondary hover:text-text-primary">
                    {texts.login}
                  </Button>
                </Link>
                <Link href="/login">
                  <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                    {texts.getStarted}
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}