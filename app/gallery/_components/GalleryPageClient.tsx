"use client"

import { HomeHeader } from "@/app/(home)/_components/HomeHeader"

export function GalleryPageClient({ children }: { children: React.ReactNode }) {
  return (
    <>
      <HomeHeader />
      {children}
    </>
  )
}