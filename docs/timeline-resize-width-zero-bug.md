# Timeline 클립 리사이즈 시 Width 0 버그 해결 가이드

## 문제 설명

### 증상
비디오 에디터의 Timeline 컴포넌트에서 클립을 리사이즈할 때 다음과 같은 문제가 발생:
- 클립의 왼쪽 핸들을 원본 시작점(startTime=0)에서 더 왼쪽으로 드래그하면 width가 0이 됨
- 클립의 오른쪽 핸들을 원본 끝점(maxDuration)에서 더 오른쪽으로 드래그하면 width가 0이 됨
- 가끔 position도 0으로 리셋되는 현상 발생

### 발생 시나리오
1. 비디오/사운드 클립이 이미 원본 미디어의 전체 구간을 사용 중
2. 사용자가 리사이즈 핸들을 원본 경계를 넘어서 드래그 시도
3. 마우스를 놓으면(mouseUp) 클립이 사라지거나 크기가 0이 됨

## 근본 원인

### 1. DOM 스타일 초기화 문제
```javascript
// 문제가 되는 코드
clipElement.style.width = '';  // 인라인 스타일 제거
clipElement.style.left = '';
```
- React 컴포넌트가 리렌더링되기 전에 인라인 스타일을 제거하면 클립의 width가 undefined 상태가 됨
- CSS에 기본 width가 정의되어 있지 않으면 브라우저가 width를 0으로 처리

### 2. 상태 동기화 문제
```javascript
// mouseMove에서 블로킹 시
if (isBlocked) {
  // DOM은 업데이트하지 않지만 상태는 저장해야 함
  setFinalResizeWidth(newWidth);   // 이 부분이 누락되면 문제 발생
  setFinalResizePosition(newPosition);
}
```
- 블로킹 상태에서도 최종 값을 상태로 저장해야 mouseUp에서 올바른 값 사용 가능
- 상태 저장을 건너뛰면 mouseUp에서 잘못된 값으로 업데이트 시도

### 3. React 상태 업데이트 비동기성
```javascript
onResizeVideoClip(activeClip, clampedWidth);  // 비동기 상태 업데이트
clipElement.style.width = '';  // 즉시 실행 - 문제 발생!
```
- React의 setState는 비동기로 처리되어 즉시 DOM에 반영되지 않음
- 인라인 스타일을 먼저 제거하면 상태 업데이트가 적용되기 전에 클립이 사라짐

## 해결 방법

### 1. 인라인 스타일 유지
```javascript
// 해결책: 스타일을 제거하지 않고 유지
// React가 다음 렌더링 사이클에서 상태 기반으로 스타일을 덮어씀
// clipElement.style.width = '';  // 이 줄을 제거!
```

### 2. 블로킹 상태에서도 유효한 값 저장
```javascript
// 블로킹 여부와 관계없이 항상 유효한 값 저장
setFinalResizeWidth(newWidth);
setFinalResizePosition(newPosition);

if (!isBlocked) {
  // DOM 업데이트는 블로킹되지 않은 경우에만
  clipElement.style.width = `${newWidth}px`;
}
```

### 3. 안전장치 추가
```javascript
// applyResizeTrim 함수에 최소 너비 보장
const safeDuration = Math.max(80, newDurationPx);  // 최소 80px

// handleResizeVideoClip에서 유효성 검증
if (newDuration <= 0) {
  console.error('Invalid duration:', newDuration);
  return;  // 잘못된 값으로 업데이트 방지
}
```

## 구현 체크리스트

### Timeline.tsx 수정사항
- [ ] mouseMove에서 블로킹 상태와 관계없이 `finalResizeWidth/Position` 저장
- [ ] mouseUp에서 인라인 스타일 제거 코드 삭제
- [ ] 블로킹된 상태에서 불필요한 업데이트 호출 방지

### clip-operations.ts 수정사항
- [ ] `applyResizeTrim` 함수에 최소 너비(80px) 보장 로직 추가
- [ ] duration 계산 시 `safeDuration` 사용

### page.tsx 수정사항
- [ ] `handleResizeVideoClip`에 0 이하 값 검증 추가

## 테스트 시나리오

1. **왼쪽 경계 테스트**
   - 클립의 startTime이 0인 상태에서 왼쪽 핸들을 더 왼쪽으로 드래그
   - 마우스 놓았을 때 클립이 원래 크기 유지하는지 확인

2. **오른쪽 경계 테스트**
   - 클립이 maxDuration에 도달한 상태에서 오른쪽 핸들을 더 오른쪽으로 드래그
   - 마우스 놓았을 때 클립이 원래 크기 유지하는지 확인

3. **정상 리사이즈 테스트**
   - 경계 내에서 리사이즈가 정상 작동하는지 확인
   - 인접 클립과의 충돌 감지가 작동하는지 확인

## 주의사항

1. **절대 인라인 스타일을 즉시 제거하지 말 것**
   - React 상태 업데이트가 완료될 때까지 기다려야 함
   - 필요하다면 `setTimeout(() => {}, 0)` 사용

2. **블로킹 로직과 상태 저장을 분리**
   - 블로킹은 DOM 업데이트만 방지
   - 상태 저장은 항상 수행

3. **최소값 보장**
   - width는 항상 MIN_CLIP_WIDTH(80px) 이상
   - position은 항상 0 이상

## 관련 파일
- `/app/video-editor/_components/Timeline.tsx` - 메인 타임라인 컴포넌트
- `/app/video-editor/_utils/clip-operations.ts` - 클립 조작 유틸리티
- `/app/video-editor/page.tsx` - 리사이즈 핸들러 함수

## 참고사항
이 문제는 DOM 조작과 React 상태 관리의 타이밍 차이에서 발생하는 전형적인 문제입니다. React의 선언적 UI 패러다임과 명령형 DOM 조작을 혼용할 때 주의가 필요합니다.