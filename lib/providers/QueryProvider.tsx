'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { ReactNode, useState } from 'react'

/**
 * React Query Provider
 * 클라이언트 사이드 캐싱을 관리합니다.
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  // QueryClient를 useState로 생성하여 SSR/CSR 간 일관성 유지
  const [queryClient] = useState(() => 
    new QueryClient({
      defaultOptions: {
        queries: {
          // 데이터가 신선한 것으로 간주되는 시간
          staleTime: 60 * 1000,      // 60초
          // 캐시에서 제거되기 전까지 시간
          gcTime: 5 * 60 * 1000,      // 5분 (구 cacheTime)
          // 윈도우 포커스 시 리페치 비활성화 (불필요한 요청 방지)
          refetchOnWindowFocus: false,
          // 재시도 설정
          retry: 1,
          retryDelay: 1000,
        },
      },
    })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* 개발 환경에서만 DevTools 표시 */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools 
          initialIsOpen={false}
        />
      )}
    </QueryClientProvider>
  )
}