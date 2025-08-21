# 기능: AI 효과 시스템 (Effect System)

## 1. 개요
사용자는 Canvas 페이지에서 AI 영상 생성을 위해 여러 카테고리(effect, camera, model)의 효과를 최대 2개까지 선택하고 조합할 수 있습니다. 이 기능은 `EffectsContext`를 통해 관리됩니다.

## 2. 핵심 파일
- **상태 및 로직**: `src/app/canvas/_context/EffectsContext.tsx`
- **데이터 조회**: `src/lib/api/canvas.ts` (Supabase에서 효과 템플릿 조회)
- **UI 컴포넌트**: `src/app/canvas/_components/Prompter.tsx` (효과 선택 패널)

## 3. 상태 구조
`EffectsContext`는 다음의 핵심 상태를 관리합니다.

```typescript
interface EffectsContextValue {
  selectedEffects: Effect[]; // 현재 선택된 효과 객체의 배열
  canAddMore: boolean;       // 효과를 더 추가할 수 있는지 여부
  maxEffects: number;        // 선택 가능한 최대 효과 수 (현재 2)
  addEffect: (effect: Effect) => void;
  removeEffect: (effectId: string) => void;
  toggleEffect: (effect: Effect) => void;
  clearEffects: () => void;
}
```

## 4. 주요 로직 설명

### 효과 데이터 로딩
- `Prompter.tsx` 컴포넌트에서 `getTemplatesByCategory` 함수를 호출하여 Supabase DB의 `effect_templates` 테이블에서 효과 목록을 가져옵니다.
- 데이터는 카테고리별로 탭에 표시됩니다.

### 효과 선택 및 제한 (`toggleEffect`)
1.  사용자가 효과를 클릭하면 `toggleEffect` 함수가 호출됩니다.
2.  `selectedEffects` 배열에 해당 효과가 이미 있는지 확인합니다.
    -   **있으면**: `removeEffect`를 호출하여 배열에서 제거합니다.
    -   **없으면**: `addEffect`를 호출하여 배열에 추가합니다.
3.  `addEffect` 함수 내부에서는 `selectedEffects.length`가 `maxEffects` (현재 2)보다 작은지 확인합니다.
    -   작을 경우에만 효과를 추가합니다.
    -   `canAddMore` 상태가 `false`로 업데이트되어 UI에서 더 이상 선택할 수 없음을 시각적으로 표시할 수 있습니다.

### 프롬프트 조합
- 영상 생성 시(`GenerationContext`의 `generateVideo` 함수 내에서), `EffectsContext`의 `selectedEffects` 배열을 가져옵니다.
- 배열의 각 `effect` 객체에 포함된 `prompt` 문자열을 `, `로 조합하여 최종 프롬프트 문자열을 생성합니다.
- 이 조합된 프롬프트가 AI 모델(fal.ai)에 전달됩니다.

```typescript
// 예시: 프롬프트 조합 로직
const combinedPrompt = selectedEffects.map(e => e.prompt).join(', ');
```

## 5. 시나리오 예시: "특정 효과를 기본으로 선택해두기"

1.  **요구사항 분석**: 사용자가 Canvas 페이지에 처음 진입했을 때, 특정 효과(예: 'Cinematic')가 미리 선택되어 있도록 변경합니다.
2.  **코드 위치 파악**: `EffectsContext.tsx`가 상태 초기화를 담당하므로 이 파일을 수정해야 합니다.
3.  **구현**: `EffectsProvider` 내에서 `useState`의 초기값을 설정하는 로직을 추가합니다.
    ```typescript
    // EffectsContext.tsx

    // 1. 기본 효과 데이터를 가져오는 로직 필요
    //    (예: getEffectByName API 함수)

    const [selectedEffects, setSelectedEffects] = useState<Effect[]>([]);

    useEffect(() => {
      // 컴포넌트 마운트 시 기본 효과를 설정하는 로직
      const setDefaultEffect = async () => {
        const defaultEffect = await api.getEffectByName('Cinematic');
        if (defaultEffect) {
          setSelectedEffects([defaultEffect]);
        }
      };
      setDefaultEffect();
    }, []); // 최초 한 번만 실행
    ```
4.  **고려사항**: 이 방법은 비동기적으로 기본값을 설정합니다. 만약 서버 사이드에서 미리 데이터를 가져올 수 있다면, `CanvasProvider`에 `initialEffects` prop을 추가하여 전달하는 것이 더 효율적입니다.
