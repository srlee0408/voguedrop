"use client"

import { useRouter } from "next/navigation"
import { cn } from "@/shared/lib/utils"
import type { Category } from "@/shared/types/database"

interface CategoryFilterProps {
  categories: Category[]
  selectedCategory: string | null
}

export function CategoryFilter({ categories, selectedCategory }: CategoryFilterProps) {
  const router = useRouter()

  const handleCategoryClick = (categoryId: string | null) => {
    if (categoryId === null) {
      router.push('/gallery')
    } else {
      router.push(`/gallery?category=${categoryId}`)
    }
  }

  return (
    <div className="flex flex-wrap gap-3 mb-12 justify-center">
      {/* All category */}
      <button
        onClick={() => handleCategoryClick(null)}
        className={cn(
          "px-6 py-2.5 rounded-full font-medium text-sm transition-all duration-200",
          selectedCategory === null
            ? "bg-white text-black hover:bg-gray-100"
            : "bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white"
        )}
      >
        All
      </button>

      {/* Dynamic categories from DB */}
      {categories.map((category) => {
        return (
          <button
            key={category.id}
            onClick={() => handleCategoryClick(category.id)}
            className={cn(
              "px-6 py-2.5 rounded-full font-medium text-sm transition-all duration-200",
              selectedCategory === category.id
                ? "bg-white text-black hover:bg-gray-100"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white"
            )}
          >
            {category.name}
          </button>
        )
      })}
    </div>
  )
}