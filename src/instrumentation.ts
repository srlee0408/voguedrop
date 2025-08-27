/**
 * Instrumentation - Next.js 애플리케이션 계측 설정
 * 
 * 주요 역할:
 * 1. Next.js 런타임별 Sentry 모니터링 초기화
 * 2. 서버 및 엣지 런타임에 따른 조건부 설정 로드
 * 3. 에러 추적 및 성능 모니터링 시스템 활성화
 * 4. 프로덕션 환경에서의 자동 계측 데이터 수집
 * 
 * 핵심 특징:
 * - Next.js 런타임 환경 감지 및 적절한 Sentry 설정 로드
 * - 서버 사이드(nodejs)와 엣지(edge) 런타임 분리 지원
 * - 동적 import로 필요한 시점에 설정 파일 로드
 * - 프로덕션 배포 시 자동으로 실행되는 계측 등록
 * 
 * 주의사항:
 * - sentry.server.config와 sentry.edge.config 파일 존재 필요
 * - NEXT_RUNTIME 환경 변수에 따라 조건부 실행
 * - 개발 환경에서도 실행되므로 설정 파일 누락 시 에러 발생
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config');
  }
}