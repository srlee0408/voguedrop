/**
 * Button - 범용 버튼 UI 컴포넌트
 * 
 * 주요 역할:
 * 1. 프로젝트 전반에서 사용되는 일관된 버튼 스타일 제공
 * 2. 다양한 버튼 변형(variant)과 크기(size) 옵션 지원
 * 3. Radix UI Slot을 통한 asChild 패턴 구현
 * 4. 접근성 및 포커스 관리 기능 내장
 * 
 * 핵심 특징:
 * - CVA(Class Variance Authority)로 타입 안전한 스타일 변형
 * - 6가지 버튼 변형: default, destructive, outline, secondary, ghost, link
 * - 4가지 크기: default, sm, lg, icon
 * - 다크 모드 및 비활성화 상태 지원
 * - SVG 아이콘 자동 크기 조정
 * 
 * 주의사항:
 * - asChild prop 사용 시 자식 요소가 버튼 역할 대체
 * - 비활성화 상태에서는 포인터 이벤트 차단
 * - 접근성을 위한 focus-visible 및 aria-invalid 처리
 */
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/shared/lib/utils/generation-progress"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90",
        destructive:
          "bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
