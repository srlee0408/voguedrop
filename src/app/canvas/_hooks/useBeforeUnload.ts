import { useEffect } from 'react';

/**
 * 브라우저 탭/창을 닫거나 새로고침할 때 경고를 표시하는 훅
 * @param shouldWarn - 경고를 표시할지 여부
 * @param message - 경고 메시지 (브라우저에 따라 무시될 수 있음)
 */
export function useBeforeUnload(
  shouldWarn: boolean,
  message: string = '진행 중인 작업이 있습니다. 정말 나가시겠습니까?'
) {
  useEffect(() => {
    if (!shouldWarn) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // 대부분의 브라우저는 커스텀 메시지를 무시하고 기본 메시지를 표시합니다
      event.returnValue = message;
      return message;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [shouldWarn, message]);
}