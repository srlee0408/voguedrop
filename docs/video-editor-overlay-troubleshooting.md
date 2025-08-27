# Video Editor 오버레이 시스템 트러블슈팅 가이드

## 개요
이 문서는 Video Editor의 오버레이 시스템(특히 텍스트 편집기)에서 발생할 수 있는 문제와 해결 방법을 정리합니다.

## 주요 문제 사례: TextOverlayEditor 선택 불가 문제 (2025-08-13)

### 문제 상황
- Player 위에 렌더링된 텍스트가 특정 상황에서 선택되지 않음
- 화면 비율 변경 시 텍스트 선택이 작동하지 않음
- 마우스 이벤트가 Player에 가려져 텍스트 편집 불가

### 근본 원인 분석

#### 1. 포인터 이벤트 충돌
```tsx
// ❌ 문제가 있던 코드
<div className="absolute inset-0 z-40">  // 전체 영역을 덮는 컨테이너
  <TextOverlayEditor />
</div>

// 해결된 코드
<div style={{ 
  zIndex: 50,
  pointerEvents: 'none'  // 컨테이너는 이벤트를 받지 않음
}}>
  <div style={{ pointerEvents: 'auto' }}>  // 내부 요소만 이벤트 받음
    {/* 텍스트 요소들 */}
  </div>
</div>
```

#### 2. 스케일 계산 타이밍 문제
```tsx
// ❌ 문제: DOM 업데이트 전에 계산
const getScale = () => {
  const rect = containerRef.current?.getBoundingClientRect();
  // 비율 변경 직후 이전 크기로 계산됨
}

// 해결: DOM 업데이트 대기 후 계산
useEffect(() => {
  requestAnimationFrame(() => {
    setForceUpdate(prev => prev + 1);  // 강제 리렌더링
  });
}, [aspectRatio, containerWidth, containerHeight]);
```

#### 3. z-index 계층 구조 혼란
```tsx
// ❌ 문제: 불명확한 z-index 관리
<Player />  // z-index 없음
<TextOverlay className="z-40" />  // Tailwind 클래스 사용

// 해결: 명시적인 z-index 계층 구조
<Player style={{ zIndex: 0 }} />
<TextOverlay style={{ 
  zIndex: 50,  // 컨테이너
  // 텍스트 요소들
  textElement: { zIndex: isSelected ? 52 : 51 }
}} />
```

## 베스트 프랙티스

### 1. 오버레이 시스템 설계 원칙

#### 포인터 이벤트 관리
- **컨테이너는 항상 `pointerEvents: 'none'`**
- **상호작용이 필요한 요소만 `pointerEvents: 'auto'`**
- 이벤트 버블링을 고려한 `stopPropagation()` 사용

#### z-index 계층 구조
```
0-9:    기본 콘텐츠 (Player, Video)
10-19:  오버레이 효과 (letterbox, gradients)
20-29:  컨트롤 UI (buttons, controls)
30-39:  모달 배경
40-49:  모달 콘텐츠
50-59:  편집 도구 (TextOverlay, Resize handles)
60+:    긴급 알림, 토스트
```

#### 스케일 계산
- **Props 기반 계산 우선**: DOM 측정보다 props 사용
- **비동기 DOM 업데이트 고려**: `requestAnimationFrame` 활용
- **디바운싱 적용**: 빈번한 리사이즈 시 성능 최적화

### 2. 디버깅 체크리스트

#### 텍스트/오버레이가 선택되지 않을 때
1. [ ] 브라우저 개발자 도구에서 요소의 `pointer-events` 확인
2. [ ] z-index 계층 구조 검증
3. [ ] 부모 요소가 이벤트를 가로채는지 확인
4. [ ] `getBoundingClientRect()` 값이 올바른지 확인

#### 비율 변경 시 문제가 발생할 때
1. [ ] 스케일 계산 로직에 `console.log` 추가
2. [ ] DOM 업데이트 타이밍 확인
3. [ ] aspectRatio prop이 제대로 전달되는지 확인
4. [ ] 강제 리렌더링이 필요한지 검토

### 3. 코드 예제

#### 안전한 오버레이 컴포넌트 구조
```tsx
interface OverlayProps {
  children: React.ReactNode;
  containerWidth: number;
  containerHeight: number;
  aspectRatio: string;
}

function SafeOverlay({ children, containerWidth, containerHeight, aspectRatio }: OverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [, forceUpdate] = useState(0);
  
  // 비율 변경 시 리렌더링
  useEffect(() => {
    requestAnimationFrame(() => {
      forceUpdate(prev => prev + 1);
    });
  }, [aspectRatio, containerWidth, containerHeight]);
  
  const getScale = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect && containerWidth && containerHeight) {
      const scaleX = rect.width / containerWidth;
      const scaleY = rect.height / containerHeight;
      return Math.min(scaleX, scaleY);
    }
    return 1;
  }, [containerWidth, containerHeight]);
  
  return (
    <div 
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 50,
        pointerEvents: 'none'  // 중요!
      }}
    >
      <div style={{ 
        pointerEvents: 'auto',
        position: 'relative',
        width: '100%',
        height: '100%'
      }}>
        {children}
      </div>
    </div>
  );
}
```

#### 이벤트 처리 패턴
```tsx
function InteractiveElement({ onSelect, id }: Props) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();  // 부모로 이벤트 전파 방지
    e.preventDefault();   // 기본 동작 방지
    onSelect(id);
  };
  
  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    // 드래그 시작 로직
  };
  
  return (
    <div
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      style={{
        pointerEvents: 'auto',  // 명시적으로 활성화
        cursor: 'pointer',
        // ... 기타 스타일
      }}
    >
      {/* 콘텐츠 */}
    </div>
  );
}
```

## 테스트 시나리오

### 오버레이 시스템 테스트
1. **기본 상호작용**
   - [ ] 텍스트 클릭으로 선택
   - [ ] 빈 공간 클릭으로 선택 해제
   - [ ] 드래그로 위치 이동
   - [ ] 리사이즈 핸들로 크기 조절

2. **비율 변경 테스트**
   - [ ] 9:16 → 1:1 변경 후 텍스트 선택
   - [ ] 1:1 → 16:9 변경 후 텍스트 선택
   - [ ] 비율 변경 중 텍스트 위치 유지

3. **Player 상호작용**
   - [ ] 텍스트가 있어도 Player 재생/일시정지 가능
   - [ ] 타임라인 시크 동작
   - [ ] 스페이스바 단축키 동작

## 관련 파일
- `/app/video-editor/_components/VideoPreview.tsx`
- `/app/video-editor/_components/TextOverlayEditor.tsx`
- `/app/video-editor/_remotion/CompositePreview.tsx`

## 참고 사항
- Remotion Player는 자체적인 이벤트 시스템을 가지고 있음
- Tailwind의 z-index 클래스보다 인라인 스타일이 더 명확함
- React의 렌더링 사이클과 DOM 업데이트는 비동기적임

## 업데이트 로그
- 2025-08-13: 초기 문서 작성 - TextOverlayEditor 선택 문제 해결