# 기능: AI 영상 생성 흐름 (Generation Flow)

## 1. 개요
AI 영상 생성은 사용자의 요청을 받아 외부 AI 서비스(fal.ai)와 연동하고, 그 결과를 다시 사용자에게 보여주는 비동기적인 프로세스입니다. `GenerationContext`가 이 전체 흐름의 상태와 제어를 담당합니다.

## 2. 핵심 파일
- **상태 및 로직**: `src/app/canvas/_context/GenerationContext.tsx`
- **AI API 연동**: `src/lib/fal-ai.ts`
- **API 프록시**: `src/app/api/fal/proxy/route.ts`
- **웹훅 처리**: `src/app/api/fal/webhook/route.ts`

## 3. 상태 구조
`GenerationContext`는 다음의 핵심 상태를 관리합니다.

```typescript
interface GenerationContextValue {
  isGenerating: boolean; // 전체 생성 프로세스가 진행 중인지 여부
  canGenerate: boolean;  // 생성을 시작할 수 있는 조건이 충족되었는지
  generatingProgress: Record<string, number>; // 각 슬롯(job)의 진행률
  generatingJobIds: Record<number, string>; // 슬롯 인덱스와 fal.ai job ID 매핑
  generationError: Record<number, string | null>; // 슬롯별 에러 메시지
  generateVideo: () => Promise<void>; // 생성 시작 함수
}
```

## 4. 주요 로직 설명

### 1. 생성 시작 (`generateVideo`)
1.  `canGenerate` 상태를 확인하여 생성 가능한지 검증합니다. (예: 이미지가 업로드되었는지)
2.  `SlotContext`의 `findAvailableSlotForGeneration()`을 호출하여 작업할 슬롯을 찾습니다.
3.  `SettingsContext`와 `EffectsContext`에서 현재 설정(프롬프트, 해상도 등)과 효과를 가져와 조합합니다.
4.  `POST /api/fal/proxy`를 호출하여 fal.ai에 영상 생성을 요청합니다. 이 때, 나중에 결과를 수신할 웹훅 URL(`https://<your-domain>/api/fal/webhook`)을 함께 전달합니다.
5.  API로부터 받은 `request_id` (job ID)를 `generatingJobIds` 상태에 슬롯 인덱스와 함께 저장합니다.
6.  `SlotContext`의 `markSlotGenerating()`을 호출하여 해당 슬롯의 UI를 '생성 중' 상태로 변경합니다.

### 2. 진행 상태 추적 (Polling)
- `GenerationContext` 내의 `useEffect` 훅에서 `generatingJobIds`에 활성 job이 있는지 주기적으로(예: 3초마다) 확인합니다.
- 각 활성 job ID에 대해 `fal.getJobStatus`를 호출하여 진행률(`percentage`)을 가져옵니다.
- 가져온 진행률을 `generatingProgress` 상태에 업데이트하여 UI(프로그레스 바)에 반영합니다.

### 3. 생성 완료 (Webhook)
1.  fal.ai에서 영상 생성이 완료되면, 생성 요청 시 전달했던 `POST /api/fal/webhook`으로 요청을 보냅니다.
2.  웹훅 요청 본문에는 생성된 비디오의 URL과 원본 `request_id`가 포함되어 있습니다.
3.  `webhook/route.ts`에서는 받은 `request_id`를 사용하여 `video_generations` 테이블에서 해당 작업을 찾고, 상태를 'completed'로, `result_video_url`을 업데이트합니다.
4.  (구현에 따라) Supabase Realtime을 사용하여 클라이언트에 즉시 완료 알림을 보냅니다.
5.  클라이언트의 `GenerationContext`는 이 알림을 수신하거나, 폴링을 통해 'COMPLETED' 상태를 확인합니다.
6.  `SlotContext`의 `placeVideoInSlot()`을 호출하여 생성된 비디오를 슬롯에 배치합니다.

## 5. 관련 문서
- **fal.ai API 상세**: `docs/features/fal.ai.md`
- **MVP 구현 방식**: `docs/features/canvas-ai-video-generation-mvp.md`
- **전체 구현 계획**: `docs/features/canvas-ai-video-generation.md`
