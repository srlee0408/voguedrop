# Image Brush 기능 구현 기획서

## 개요
VogueDrop Canvas에서 업로드한 이미지를 AI로 편집할 수 있는 Image Brush 기능을 구현합니다. 사용자가 이미지의 특정 부분을 마스킹하고 프롬프트를 입력하면, AI가 해당 영역을 새로운 내용으로 채워줍니다.

## 핵심 기술
- **BFL FLUX Fill API**: 프롬프트 기반 이미지 인페인팅
- **RunPod I2I API**: 이미지 간 스타일 변환 (선택사항)
- **Supabase Edge Function**: 이미지 처리 및 AI API 호출
- **HTML Canvas API**: 마스크 그리기 인터페이스

## 기능 요구사항

### 1. 사용자 워크플로우
1. Canvas 페이지에서 이미지 업로드
2. "Image Brush" 버튼 클릭
3. 모달에서 마스크 영역 그리기
4. 프롬프트 입력 (예: "expand t-shirt part")
5. Generate 버튼 클릭
6. AI 처리 결과 확인 및 적용

### 2. 주요 기능
- **마스크 도구**
  - Brush: 마스크 영역 그리기
  - Eraser: 마스크 영역 지우기
  - Clear: 전체 마스크 초기화
  - 브러시 크기 조절 (5px ~ 100px)

- **AI 처리**
  - FLUX Fill: 마스크 영역을 프롬프트에 따라 재생성
  - I2I 변환: 이미지 스타일 변환 (선택사항)
  - 처리 진행률 표시
  - 실패 시 재시도 옵션

- **결과 관리**
  - 원본 이미지 보존
  - 편집된 이미지 저장
  - Canvas slot에 자동 적용
  - 히스토리 관리

## 기술 구현 상세

### 1. 프론트엔드 구조

#### 1.1 UI 컴포넌트 수정
```typescript
// app/canvas/_components/CanvasControls.tsx
// Resolution 버튼을 Image Brush 버튼으로 변경
<Button
  onClick={onImageBrushOpen}
  disabled={!uploadedImage}
  className="flex items-center gap-2"
>
  <Brush className="w-4 h-4" />
  <span>Image Brush</span>
</Button>
```

#### 1.2 Image Brush 모달 컴포넌트
```typescript
// app/canvas/_components/ImageBrushModal.tsx
interface ImageBrushModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  onComplete: (brushedImageUrl: string) => void;
}

// 주요 상태
- canvasRef: HTMLCanvasElement 참조
- maskCanvas: 마스크 레이어
- brushSize: 브러시 크기
- currentTool: 'brush' | 'eraser'
- prompt: 사용자 입력 프롬프트
- isProcessing: 처리 중 상태
```

#### 1.3 Canvas 그리기 로직
```typescript
// 마스크 그리기 함수
const drawMask = (x: number, y: number) => {
  const ctx = maskCanvas.getContext('2d');
  ctx.globalCompositeOperation = currentTool === 'brush' 
    ? 'source-over' 
    : 'destination-out';
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
  ctx.fill();
};

// 마스크를 이미지로 변환
const getMaskImage = (): string => {
  return maskCanvas.toDataURL('image/png');
};
```

### 2. 백엔드 구조

#### 2.1 Supabase Edge Function
```typescript
// supabase/functions/image-brush/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

interface ImageBrushRequest {
  image: string;      // Base64 인코딩된 원본 이미지
  mask: string;       // Base64 인코딩된 마스크 이미지
  prompt: string;     // 사용자 프롬프트
  mode: 'flux' | 'i2i';  // 처리 모드
  userId: string;
}

serve(async (req) => {
  // 1. 인증 확인
  // 2. 요청 데이터 파싱
  // 3. AI API 호출 (BFL 또는 RunPod)
  // 4. 결과 이미지 Supabase Storage 저장
  // 5. 응답 반환
});
```

#### 2.2 BFL FLUX Fill API 통합
```typescript
const callFluxFillAPI = async (
  image: string, 
  mask: string, 
  prompt: string
) => {
  const BFL_TOKEN = Deno.env.get('BFL_TOKEN');
  const FLUX_URL = "https://api.us1.bfl.ai/v1/flux-pro-1.0-fill";
  
  const requestData = {
    prompt: prompt,
    seed: Math.floor(Math.random() * 999999),
    image: image,
    mask: mask,
    guidance: 80,
    output_format: "png",
    safety_tolerance: 2,
    prompt_upsampling: false,
  };
  
  const response = await fetch(FLUX_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Key': BFL_TOKEN,
    },
    body: JSON.stringify(requestData),
  });
  
  // 결과 폴링 및 이미지 다운로드
  return await pollForResult(response.json().id);
};
```

#### 2.3 RunPod I2I API 통합 (선택사항)
```typescript
const callRunPodAPI = async (
  input1: string,  // 인페인트될 텍스처
  input2: string,  // 레퍼런스 이미지
  mask: string     // 마스크
) => {
  const RUNPOD_API_KEY = Deno.env.get('RUNPOD_API_KEY');
  const RUNPOD_ENDPOINT_ID = Deno.env.get('RUNPOD_ENDPOINT_ID');
  
  const requestData = {
    input: {
      workflow: loadWorkflowJson(),
      images: [
        { name: "input-1.png", image: input1 },
        { name: "input-2.png", image: input2 },
        { name: "mask.png", image: mask }
      ]
    }
  };
  
  // RunPod API 호출 및 결과 폴링
};
```

### 3. API Route
```typescript
// app/api/canvas/image-brush/route.ts
export async function POST(request: NextRequest) {
  try {
    // 1. 인증 확인
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    // 2. Edge Function 호출
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL}/image-brush`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image,
          mask,
          prompt,
          mode,
          userId: user.id,
        }),
      }
    );
    
    // 3. 응답 처리
    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: '처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
```

### 4. 타입 정의
```typescript
// types/image-brush.ts
export interface ImageBrushRequest {
  image: string;      // Base64 원본 이미지
  mask: string;       // Base64 마스크 이미지
  prompt: string;     // 사용자 프롬프트
  mode: 'flux' | 'i2i';
}

export interface ImageBrushResponse {
  success: boolean;
  imageUrl?: string;  // 처리된 이미지 URL
  error?: string;
}

export interface BrushSettings {
  size: number;       // 5 ~ 100
  opacity: number;    // 0.1 ~ 1.0
  hardness: number;   // 0 ~ 1
}

export type BrushTool = 'brush' | 'eraser' | 'clear';
```

### 5. Canvas Context 업데이트
```typescript
// app/canvas/_context/CanvasContext.tsx
interface CanvasState {
  // 기존 상태...
  brushedImage: string | null;
  imageBrushHistory: Array<{
    original: string;
    brushed: string;
    prompt: string;
    timestamp: number;
  }>;
}

// Image Brush 완료 핸들러
const handleImageBrushComplete = (brushedImageUrl: string) => {
  // 현재 활성 슬롯에 적용
  updateSlot(activeSlotId, { 
    imageUrl: brushedImageUrl,
    metadata: { brushed: true }
  });
  
  // 히스토리에 추가
  addToHistory({
    original: currentImage,
    brushed: brushedImageUrl,
    prompt,
    timestamp: Date.now()
  });
};
```

## 환경 변수 설정

### 1. 로컬 개발 (.env.local)
```env
# BFL API
BFL_TOKEN=your_bfl_api_token

# RunPod API (선택사항)
RUNPOD_API_KEY=your_runpod_api_key
RUNPOD_ENDPOINT_ID=your_endpoint_id

# Supabase Functions URL
NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL=https://your-project.supabase.co/functions/v1
```

### 2. Supabase Edge Function 환경 변수
```bash
# BFL API 토큰 설정
npx supabase@latest secrets set BFL_TOKEN=your_token --project-ref YOUR_PROJECT_REF

# RunPod API 설정 (선택사항)
npx supabase@latest secrets set RUNPOD_API_KEY=your_key --project-ref YOUR_PROJECT_REF
npx supabase@latest secrets set RUNPOD_ENDPOINT_ID=your_id --project-ref YOUR_PROJECT_REF
```

## 배포 전략

### 1. Supabase Edge Function 배포
```bash
# Edge Function 배포
cd /Users/srlee/Desktop/커서개발/3. 서비스/voguedrop
npx supabase@latest functions deploy image-brush --project-ref YOUR_PROJECT_REF

# 배포 확인
npx supabase@latest functions list --project-ref YOUR_PROJECT_REF
```

### 2. Vercel 배포
- 프론트엔드와 API Route는 기존 Vercel 배포 프로세스 사용
- Edge Function URL을 환경 변수로 설정

### 3. 모니터링
```bash
# Edge Function 로그 확인
npx supabase@latest functions logs image-brush --project-ref YOUR_PROJECT_REF --tail 100
```

## UX 고려사항

### 1. 모달 디자인
- **크기**: 최소 800x600px, 반응형 지원
- **레이아웃**: 좌측 캔버스, 우측 도구 패널
- **피드백**: 실시간 마스크 미리보기, 처리 진행률 표시

### 2. 사용성
- **단축키 지원**
  - B: Brush 도구
  - E: Eraser 도구
  - Ctrl+Z: 실행 취소
  - [, ]: 브러시 크기 조절

### 3. 성능 최적화
- 이미지 리사이징: 최대 1024x1024로 제한
- 디바운싱: 브러시 스트로크 최적화
- 캐싱: 처리된 이미지 로컬 캐싱

## 에러 처리

### 1. 프론트엔드
- 네트워크 오류: 재시도 옵션 제공
- API 한도 초과: 사용자에게 알림
- 이미지 로드 실패: 대체 이미지 표시

### 2. 백엔드
- API 키 만료: 관리자에게 알림
- 타임아웃: 60초 제한, 사용자에게 피드백
- 스토리지 오류: 롤백 처리

## 테스트 계획

### 1. 단위 테스트
- 마스크 그리기 함수
- Base64 변환 함수
- API 요청/응답 처리

### 2. 통합 테스트
- 전체 워크플로우 테스트
- Edge Function 호출 테스트
- 에러 시나리오 테스트

### 3. 사용자 테스트
- 다양한 이미지 크기 테스트
- 브라우저 호환성 테스트
- 성능 테스트 (대용량 이미지)

## 향후 개선사항

### Phase 2
- 브러시 모양 다양화 (원형, 사각형, 커스텀)
- 레이어 기능 추가
- 히스토리 기반 실행 취소/다시 실행

### Phase 3
- AI 자동 마스킹 (세그멘테이션)
- 배치 처리 지원
- 프리셋 저장/불러오기

## 참고 자료
- [BFL FLUX Fill API 문서](https://docs.bfl.ai/flux-fill)
- [RunPod API 문서](https://docs.runpod.io/api)
- [Supabase Edge Functions 문서](https://supabase.com/docs/guides/functions)
- [HTML Canvas API MDN](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)

## 구현 일정
- **1주차**: UI 컴포넌트 및 마스킹 도구 구현
- **2주차**: Edge Function 및 AI API 통합
- **3주차**: 테스트 및 버그 수정
- **4주차**: 배포 및 모니터링 설정