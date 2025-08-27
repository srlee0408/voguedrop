/**
 * SignupForm - 사용자 회원가입 폼 컴포넌트
 * 
 * 주요 역할:
 * 1. 이메일/비밀번호 기반 신규 계정 생성
 * 2. 비밀번호 확인 및 강도 검증
 * 3. 폼 유효성 검사 및 실시간 피드백
 * 4. Supabase Auth를 통한 계정 생성 처리
 * 
 * 핵심 특징:
 * - 이메일 형식 및 비밀번호 최소 길이 검증
 * - 비밀번호 확인 일치 여부 검사
 * - 실시간 폼 유효성 검사 및 에러 표시
 * - 회원가입 성공 시 자동 로그인 처리
 * 
 * 주의사항:
 * - 비밀번호 최소 8자 이상 요구
 * - 이메일 중복 여부는 Supabase에서 처리
 * - 회원가입 후 이메일 인증 프로세스 고려 필요
 * - 개인정보 처리 방침 동의 절차 추가 검토
 */
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { SignupFormData } from '@/shared/types/auth'
import { createClient } from '@/shared/lib/supabase/client'

export function SignupForm() {
  const router = useRouter()
  const supabase = createClient()
  const [formData, setFormData] = useState<SignupFormData>({
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const validatePassword = (password: string) => {
    return password.length >= 8
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate email format
    if (!validateEmail(formData.email)) {
      setError('Please enter a valid email address')
      return
    }

    // Validate password strength
    if (!validatePassword(formData.password)) {
      setError('Password must be at least 8 characters long')
      return
    }

    // Validate password match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setIsLoading(true)

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      })

      if (signUpError) {
        throw signUpError
      }

      // Auto sign in after successful signup
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      })

      if (signInError) {
        throw signInError
      }

      // Redirect to home page on successful signup
      router.push('/')
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('An error occurred during signup')
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
          autoComplete="new-password"
          required
          value={formData.password}
          onChange={handleChange}
          className="input-base"
          placeholder="••••••••"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Must be at least 8 characters long
        </p>
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground mb-2">
          Confirm Password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          value={formData.confirmPassword}
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
        {isLoading ? 'Creating account...' : 'Create account'}
      </button>
    </form>
  )
}