'use client'

import { useEffect } from 'react'
import { Button } from '@/shared/components/ui/button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // 에러를 로깅 서비스에 기록
    console.error('Application error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="text-center space-y-4 max-w-md px-4">
        <h1 className="text-4xl font-bold text-foreground">
          Something went wrong
        </h1>
        <p className="text-text-secondary">
          An unexpected error occurred. Please try again later.
        </p>
        <div className="pt-4">
          <Button
            onClick={reset}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Try again
          </Button>
        </div>
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 p-4 bg-surface-secondary rounded-lg text-left">
            <p className="text-xs text-text-secondary font-mono">
              {error.message}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}