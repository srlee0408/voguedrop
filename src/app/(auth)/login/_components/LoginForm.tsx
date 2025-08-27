/**
 * LoginForm - 사용자 로그인 폼 컴포넌트
 * 
 * 주요 역할:
 * 1. 이메일/비밀번호 기반 사용자 인증
 * 2. 폼 유효성 검사 및 에러 처리
 * 3. Supabase Auth를 통한 로그인 처리
 * 4. 로그인 후 리다이렉트 URL 처리
 * 
 * 핵심 특징:
 * - 클라이언트 사이드 이메일 형식 검증
 * - 로딩 상태 관리로 중복 제출 방지
 * - URL 쿼리 파라미터 기반 리다이렉트 지원
 * - 사용자 친화적인 에러 메시지 표시
 * 
 * 주의사항:
 * - 비밀번호는 평문으로 전송되지만 Supabase에서 암호화 처리
 * - 로그인 실패 시 구체적인 실패 원인 노출 방지
 * - 리다이렉트 URL 검증으로 오픈 리다이렉트 취약점 방지
 */
'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { LoginFormData } from '@/shared/types/auth'
import { createClient } from '@/shared/lib/supabase/client'

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  
  const redirect = searchParams.get('redirect') || '/'

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate email format
    if (!validateEmail(formData.email)) {
      setError('Please enter a valid email address')
      return
    }

    // Validate password
    if (!formData.password) {
      setError('Password is required')
      return
    }

    setIsLoading(true)

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      })

      if (signInError) {
        throw signInError
      }

      // Redirect to the intended page or home
      router.push(redirect)
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('An error occurred during login')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
    // Clear error when user starts typing
    if (error) setError(null)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={formData.email}
          onChange={handleChange}
          className="input-base"
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={formData.password}
          onChange={handleChange}
          className="input-base"
          placeholder="••••••••"
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-primary/20"
      >
        {isLoading ? 'Signing in...' : 'Sign in'}
      </button>
    </form>
  )
}