/**
 * 모든 카드를 9:16 비율로 고정
 */
export const CARD_CONTAINER_CLASS = 'w-full aspect-[9/16]';

/**
 * 콘텐츠의 object-fit 스타일 결정
 * @param aspectRatio - 콘텐츠의 원본 비율
 * @returns object-fit 클래스 문자열
 */
export const getContentFitStyle = (aspectRatio?: string): string => {
  switch(aspectRatio) {
    case '9:16':
      // 컨테이너와 동일한 비율 - 꽉 채움
      return 'object-cover';
    case '1:1':
      // 정사각형 콘텐츠 - 레터박스 처리
      return 'object-contain bg-black';
    case '16:9':
      // 가로형 콘텐츠 - 레터박스 처리
      return 'object-contain bg-black';
    default:
      return 'object-cover';
  }
};