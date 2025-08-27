/**
 * 모든 카드를 9:16 비율로 고정
 */
export const CARD_CONTAINER_CLASS = 'w-full aspect-[9/16]';

/**
 * 콘텐츠의 object-fit 스타일 결정 (Canvas 슬롯과 동일하게 모든 비율에서 object-contain 사용)
 * @param aspectRatio - 콘텐츠의 원본 비율 (현재 사용하지 않음)
 * @returns object-fit 클래스 문자열
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const getContentFitStyle = (aspectRatio?: string): string => {
  // Canvas 슬롯처럼 모든 비율에서 object-contain을 사용하여 전체 콘텐츠가 보이도록 함
  return 'w-full h-full object-contain object-center';
};