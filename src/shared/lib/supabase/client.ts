/**
 * Supabase Client - 브라우저용 Supabase 클라이언트 생성
 * 
 * 주요 역할:
 * 1. 클라이언트 사이드에서 사용할 Supabase 인스턴스 생성
 * 2. 환경 변수에서 URL과 익명 키 자동 주입
 * 3. SSR 호환을 위한 브라우저 전용 클라이언트 설정
 * 4. 인증, 데이터베이스, 스토리지 기능에 대한 통합 접근점
 * 
 * 핵심 특징:
 * - createBrowserClient로 브라우저 환경 최적화
 * - 환경 변수 기반 자동 설정
 * - 클라이언트 사이드 렌더링 지원
 * - 사용자 세션 및 인증 상태 자동 관리
 * 
 * 주의사항:
 * - 브라우저에서만 사용 가능 (서버 사이드에서는 server.ts 사용)
 * - NEXT_PUBLIC_ 접두사로 클라이언트에 노출되는 환경 변수
 * - 익명 키는 공개되어도 안전하지만 RLS 정책 준수 필요
 */
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}