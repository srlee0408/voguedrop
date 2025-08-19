# Image Brush (Inpainting) 기능 구현 계획

## 개요
Canvas 페이지에서 이미지 편집을 위한 Brush 기능을 구현합니다. 사용자가 이미지의 특정 영역을 마스킹하고 AI를 통해 해당 영역을 수정할 수 있습니다.

## 주요 변경사항
- **해상도 설정 제거**: Canvas를 1024×1024 고정 크기로 변경
- **Brush 버튼 추가**: Generate/Duration 버튼 옆의 해상도 표시를 Brush 버튼으로 교체
- **자동 편집 모드**: 이미지 업로드 시 자동으로 Image Brush 모달이 열려 즉시 편집 가능
- **Dual Provider 지원**: RunPod API와 BFL API 선택 가능

## 아키텍처

### 시스템 구조
```
┌─────────────┐     ┌─────────────────┐     ┌──────────────────┐
│   Client    │────▶│  Vercel API     │────▶│ Supabase Edge    │
│  (Next.js)  │     │  (초기 요청)     │     │ Functions        │
│             │◀────│  (Job ID 반환)   │     │ (실제 처리)      │
└─────────────┘     └─────────────────┘     └──────────────────┘
       │                                              │
       │                                              ▼
       │                                     ┌──────────────────┐
       │                                     │ RunPod/BFL API   │
       │                                     └──────────────────┘
       ▼
┌─────────────────────────────────────────────────────────────┐
│                    Supabase Storage & Database              │
└─────────────────────────────────────────────────────────────┘
```

### 처리 흐름
1. 사용자가 이미지를 업로드하면 자동으로 Image Brush 모달 열림
2. 업로드된 이미지가 슬롯에 배치되고 자동 선택됨
3. 사용자가 마스크를 그리고 프롬프트 입력 후 생성 요청
4. Client에서 이미지와 마스크를 Supabase Storage에 업로드
5. Vercel API에서 Job 생성 후 Edge Function 트리거
6. Edge Function에서 RunPod/BFL API 호출 및 처리 (업로드된 이미지를 input-2로 사용)
7. Client에서 3초 간격으로 Job 상태 polling
8. 완료 시 자동으로 Canvas 슬롯에 업로드

## 환경 변수 설정

### Vercel (.env.local)
```bash
# Inpaint Provider 설정
INPAINT_PROVIDER=RUNPOD  # 또는 BFL
NEXT_PUBLIC_INPAINT_PROVIDER=RUNPOD

# Supabase Edge Function
SUPABASE_EDGE_FUNCTION_URL=https://[project-ref].supabase.co/functions/v1
SUPABASE_SERVICE_KEY=your-service-key
```

### Supabase Edge Functions
```bash
# RunPod 설정
RUNPOD_API_KEY=your-runpod-key
RUNPOD_ENDPOINT_ID=your-endpoint-id

# BFL 설정 (대체 옵션)
BFL_API_KEY=your-bfl-key

# Provider 선택
INPAINT_PROVIDER=RUNPOD  # 또는 BFL
```

## API 구조

### RunPod API 요청 형식
```typescript
interface RunPodInpaintRequest {
  input: {
    workflow: object;  // ComfyUI JSON
    images: [
      {
        name: "input-1.png";  // 텍스처/패턴
        image: string;        // base64
      },
      {
        name: "input-2.png";  // 원본 이미지
        image: string;        // base64
      },
      {
        name: "mask.png";     // 마스크 (알파 0 = 수정 영역)
        image: string;        // base64
      }
    ]
  }
}
```

### BFL API 요청 형식
```typescript
interface BFLInpaintRequest {
  prompt: string;
  image: string;      // base64 원본
  mask: string;       // base64 마스크 (흰색 = 수정 영역)
  guidance: number;
  output_format: "png";
  safety_tolerance: number;
  prompt_upsampling: boolean;
}
```

## 구현 세부사항

### 1. UI 변경사항

#### Canvas Controls 수정
```typescript
// 제거할 코드
<button className="px-3 h-10 ...">
  {selectedResolution} ({selectedSize})
</button>

// 추가할 코드
<Button
  className="flex items-center gap-2 px-4 py-2"
  onClick={onImageBrushClick}
  disabled={!hasImageInSelectedSlot}
>
  <Brush className="w-4 h-4" />
  <span>Brush</span>
</Button>
```

#### Canvas Settings 수정
```typescript
// useCanvasSettings.ts에서 제거
- selectedResolution: '1:1'
- selectedSize: '1024×1024'

// 고정값 사용
const CANVAS_SIZE = 1024;
```

#### 이미지 업로드 시 자동 모달 열기
```typescript
// CanvasLayout.tsx의 handleImageUpload 수정
const handleImageUpload = (imageUrl: string): void => {
  setCurrentGeneratingImage(imageUrl)
  slotManager.handleImageUpload(imageUrl, videoGeneration.isSlotGenerating)
  
  // 이미지가 슬롯에 배치된 후 자동으로 해당 슬롯 선택
  const uploadedSlotIndex = slotManager.slotContents.findIndex(
    slot => slot?.type === 'image' && slot.data === imageUrl
  )
  if (uploadedSlotIndex !== -1) {
    slotManager.handleSlotSelect(uploadedSlotIndex)
    // 약간의 지연 후 Image Brush 모달 자동 열기
    setTimeout(() => {
      modals.openModal('imageBrush')
    }, 100)
  }
}
```

### 2. 브러시 모달 구조

#### UI 레이아웃
```
┌─────────────────────────────────────────────────┐
│              Image Brush Editor                  │
├───────────┬──────────────────────┬───────────────┤
│           │                      │               │
│ [Brush]   │  ┌──────────────┐  │ Prompt:       │
│ [Eraser]  │  │              │  │ [________]    │
│           │  │   1024×1024  │  │               │
│ Size: 20  │  │    Canvas    │  │ Texture:      │
│ [====]    │  │              │  │ [Upload]      │
│           │  └──────────────┘  │               │
│ [Clear]   │                      │ [Generate]    │
│ [Undo]    │                      │               │
│ [Redo]    │                      │ Progress:     │
│           │                      │ ▓▓▓░░ 40%    │
└───────────┴──────────────────────┴───────────────┘
```

#### 기능 목록
- **브러시 도구**
  - 브러시/지우개 모드 전환
  - 브러시 크기 조절 (5px ~ 100px)
  - 실행 취소/다시 실행 (Ctrl+Z / Ctrl+Y)
  - 마스크 초기화
  
- **마스크 처리**
  - 빨간색 반투명 오버레이로 마스크 영역 표시
  - RunPod: 알파 채널 0 = 수정 영역
  - BFL: 흰색 = 수정 영역

### 3. Supabase Edge Function

#### 생성 및 배포
```bash
# Edge Function 생성
supabase functions new inpaint-processor

# 배포
supabase functions deploy inpaint-processor
```

#### 핵심 로직
```typescript
// supabase/functions/inpaint-processor/index.ts
serve(async (req) => {
  const { jobId, imageUrl, maskUrl, textureUrl, prompt } = await req.json()
  
  // Provider에 따라 다른 API 호출
  if (PROVIDER === 'RUNPOD') {
    result = await processWithRunPod(...)
  } else {
    result = await processWithBFL(...)
  }
  
  // 결과 저장 및 DB 업데이트
  await saveResultAndUpdateDB(result, jobId)
})
```

### 4. Vercel API Routes

#### 초기 요청 처리
```typescript
// app/api/canvas/inpaint/route.ts
export async function POST(request: NextRequest) {
  // 1. 이미지 업로드
  const jobId = await uploadImagesAndCreateJob(formData)
  
  // 2. Edge Function 트리거 (비동기)
  triggerEdgeFunction(jobId)
  
  // 3. Job ID 즉시 반환
  return NextResponse.json({ jobId })
}
```

#### 상태 확인 (Polling)
```typescript
// app/api/canvas/inpaint/[jobId]/status/route.ts
export async function GET(request, { params }) {
  const job = await getJobStatus(params.jobId)
  
  if (job.status === 'completed') {
    return NextResponse.json({
      status: 'completed',
      imageUrl: job.output_url
    })
  }
  
  return NextResponse.json({ status: job.status })
}
```

## 파일 구조

```
app/
├── api/
│   └── canvas/
│       └── inpaint/
│           ├── route.ts                    # 초기 요청
│           └── [jobId]/
│               └── status/
│                   └── route.ts            # 상태 확인
│
├── canvas/
│   ├── _components/
│   │   ├── CanvasControls.tsx             # 수정: Brush 버튼 추가
│   │   ├── Canvas.tsx                     # 수정: 해상도 제거
│   │   └── CanvasLayout.tsx               # 수정: 브러시 모달 연동
│   ├── _hooks/
│   │   ├── useCanvasSettings.ts           # 수정: 해상도 설정 제거
│   │   └── useModalManager.ts             # 수정: imageBrush 타입 추가
│   └── _context/
│       └── CanvasContext.tsx              # 수정: 브러시 상태 추가
│
components/
└── modals/
    └── image-brush/
        ├── ImageBrushModal.tsx             # 새로 생성
        ├── components/
        │   ├── BrushCanvas.tsx
        │   ├── BrushToolbar.tsx
        │   └── TextureSelector.tsx
        ├── hooks/
        │   ├── useBrushCanvas.ts
        │   ├── useImageCompression.ts
        │   └── useInpaintGeneration.ts
        └── utils/
            ├── canvas-utils.ts
            └── workflow-template.ts

supabase/
└── functions/
    └── inpaint-processor/
        ├── index.ts                        # Edge Function
        └── workflow.json                    # RunPod 워크플로우

types/
└── image-brush.ts                          # 새로 생성
```

## 데이터베이스 스키마

### video_generations 테이블 수정
```sql
ALTER TABLE video_generations
ADD COLUMN generation_type VARCHAR(20) DEFAULT 'video',
ADD COLUMN mask_url TEXT,
ADD COLUMN texture_url TEXT,
ADD COLUMN inpaint_provider VARCHAR(20);

-- 인덱스 추가
CREATE INDEX idx_generation_type ON video_generations(generation_type);
CREATE INDEX idx_job_status ON video_generations(job_id, status);
```

### Supabase Storage Buckets
- `inpaint-inputs`: 원본, 마스크, 텍스처 이미지 저장
- `inpaint-results`: 생성된 결과 이미지 저장

## Vercel 배포 설정

### vercel.json
```json
{
  "functions": {
    "app/api/canvas/inpaint/route.ts": {
      "maxDuration": 10
    },
    "app/api/canvas/inpaint/[jobId]/status/route.ts": {
      "maxDuration": 5
    }
  },
  "env": {
    "INPAINT_PROVIDER": "RUNPOD"
  }
}
```

## 구현 순서

### Phase 1: 기반 작업
1. Supabase Edge Function 생성 및 배포
2. 환경변수 설정 (Vercel, Supabase)
3. 데이터베이스 스키마 수정

### Phase 2: API 구현
1. Vercel API Routes 구현
   - 초기 요청 처리
   - 상태 확인 엔드포인트
2. Edge Function 로직 구현
   - RunPod API 통합
   - BFL API 통합 (옵션)

### Phase 3: UI 구현
1. Canvas Controls 수정
   - 해상도 버튼 제거
   - Brush 버튼 추가
2. 브러시 캔버스 컴포넌트 구현
   - 마스크 그리기 기능
   - 도구 UI
3. 브러시 모달 통합
   - 전체 UI 구성
   - API 연동

### Phase 4: 테스트 및 배포
1. 로컬 환경 테스트
2. Vercel Preview 배포
3. 프로덕션 배포

## 성능 최적화

### 이미지 압축
```typescript
const compressImage = async (file: File): Promise<Blob> => {
  // 1024x1024로 리사이즈 및 압축
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 1024
  // ... 압축 로직
  return canvas.toBlob(blob => blob, 'image/png', 0.9)
}
```

### Polling 최적화
- 3초 간격 polling
- 최대 2분 타임아웃
- 진행률 표시로 UX 개선

## 에러 처리

### 재시도 로직
```typescript
const MAX_RETRIES = 3
const RETRY_DELAY = 5000

async function retryableRequest(fn, retries = MAX_RETRIES) {
  try {
    return await fn()
  } catch (error) {
    if (retries > 0) {
      await new Promise(r => setTimeout(r, RETRY_DELAY))
      return retryableRequest(fn, retries - 1)
    }
    throw error
  }
}
```

### 사용자 피드백
- 진행 상태 실시간 표시
- 에러 발생 시 명확한 메시지
- 재시도 옵션 제공

## 보안 고려사항

1. **인증**: 로그인한 사용자만 접근 가능
2. **Rate Limiting**: 사용자별 일일 생성 제한
3. **파일 검증**: 업로드 파일 타입 및 크기 제한
4. **API Key 보호**: Service Key는 서버에서만 사용

## 예상 일정

- **Phase 1**: 1일 (기반 작업)
- **Phase 2**: 2일 (API 구현)
- **Phase 3**: 3일 (UI 구현)
- **Phase 4**: 1일 (테스트 및 배포)
- **총 예상 기간**: 7일

## 참고 문서

- [RunPod API Documentation](https://docs.runpod.io/api)
- [BFL FLUX Fill API](https://docs.bfl.ai/flux-fill)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Vercel Functions](https://vercel.com/docs/functions)

## 체크리스트

- [ ] Supabase Edge Function 생성
- [ ] 환경변수 설정 완료
- [ ] DB 스키마 수정
- [ ] API Routes 구현
- [ ] Canvas UI 수정
- [ ] 브러시 캔버스 구현
- [ ] 모달 통합
- [ ] 로컬 테스트
- [ ] Preview 배포
- [ ] 프로덕션 배포