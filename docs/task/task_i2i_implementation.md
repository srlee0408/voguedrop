# I2I (Image-to-Image) 기능 구현 가이드

## 개요
RunPod API와 ComfyUI workflow를 활용하여 참조 이미지의 스타일을 타겟 이미지에 적용하는 I2I (Image-to-Image) 변환 기능을 구현합니다. 이 기능은 패션 산업에서 텍스처와 패턴을 의류에 적용하는 데 활용됩니다.

## 현재 상태
- ✅ Image Brush 기본 기능 구현 완료 (FLUX Fill API)
- ✅ 마스크 기반 인페인팅 UI 구현
- ❌ I2I 모드 비활성화 상태
- ❌ RunPod API 미통합

## 구현 요구사항

### 1. 기능 요구사항
- 참조 이미지의 스타일/텍스처를 타겟 이미지의 마스크 영역에 적용
- 3개 이미지 입력: 타겟, 참조, 마스크
- 스타일 강도 조절 가능 (0.5 ~ 1.5)
- 처리 시간: 10-30초
- 결과 이미지 저장 및 히스토리 관리

### 2. 기술 요구사항
- RunPod Serverless Endpoint 사용
- ComfyUI workflow 기반 처리
- FLUX Fill 모델 + 스타일 전이
- 비동기 작업 처리 (polling 방식)

## 구현 상세

### 1. RunPod Workflow JSON 생성

#### 파일 위치
`supabase/functions/image-brush/workflow.json`

#### 주요 구조
```json
{
  "10": {
    "inputs": {
      "vae_name": "ae.safetensors"
    },
    "class_type": "VAELoader"
  },
  "422": {
    "inputs": {
      "image": "input-1.png",
      "upload": "image"
    },
    "class_type": "LoadImage",
    "_meta": {
      "title": "텍스처 이미지 로드"
    }
  },
  "590": {
    "inputs": {
      "image": "input-2.png",
      "upload": "image"
    },
    "class_type": "LoadImage",
    "_meta": {
      "title": "레퍼런스 이미지 로드"
    }
  },
  "698": {
    "inputs": {
      "image": "mask.png",
      "channel": "alpha",
      "upload": "image"
    },
    "class_type": "LoadImageMask",
    "_meta": {
      "title": "마스크 이미지 로드"
    }
  },
  "689": {
    "inputs": {
      "seed": "{seed}",
      "steps": 28,
      "cfg": 1,
      "sampler_name": "euler",
      "scheduler": "beta",
      "denoise": 1
    },
    "class_type": "KSampler"
  }
}
```

**중요**: `{seed}` 플레이스홀더는 런타임에 랜덤 값으로 치환됨

### 2. Supabase Edge Function 수정

#### 파일: `supabase/functions/image-brush/index.ts`

#### RunPod API 통합 함수
```typescript
// RunPod API 설정
const RUNPOD_API_URL = `https://api.runpod.ai/v2/${RUNPOD_ENDPOINT_ID}/run`;
const RUNPOD_STATUS_URL = `https://api.runpod.ai/v2/${RUNPOD_ENDPOINT_ID}/status`;

// Workflow JSON 로드 및 seed 치환
async function loadWorkflowJson(): Promise<any> {
  const workflowPath = new URL('./workflow.json', import.meta.url);
  const workflowText = await Deno.readTextFile(workflowPath);
  const seed = Math.floor(Math.random() * 999999);
  return JSON.parse(workflowText.replace('{seed}', seed.toString()));
}

// RunPod API 호출
async function callRunPodAPI(
  textureImage: string,    // input-1.png: 인페인트될 텍스처
  referenceImage: string,  // input-2.png: 레퍼런스 이미지
  maskImage: string,       // mask.png: 마스크 (알파 채널)
  apiKey: string,
  endpointId: string
): Promise<string> {
  const workflowData = await loadWorkflowJson();
  
  const requestData = {
    input: {
      workflow: workflowData,
      images: [
        {
          name: "input-1.png",
          image: textureImage.split(',')[1] || textureImage
        },
        {
          name: "input-2.png",
          image: referenceImage.split(',')[1] || referenceImage
        },
        {
          name: "mask.png",
          image: maskImage.split(',')[1] || maskImage
        }
      ]
    }
  };

  // API 호출
  const response = await fetch(RUNPOD_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestData)
  });

  if (!response.ok) {
    throw new Error(`RunPod API error: ${response.status}`);
  }

  const { id: jobId } = await response.json();
  
  // 결과 폴링
  return await pollRunPodResult(jobId, apiKey, endpointId);
}

// 결과 폴링
async function pollRunPodResult(
  jobId: string,
  apiKey: string,
  endpointId: string
): Promise<string> {
  const statusUrl = `${RUNPOD_STATUS_URL}/${jobId}`;
  const maxAttempts = 150; // 5분 (2초 * 150)
  
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const response = await fetch(statusUrl, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    const data = await response.json();
    
    if (data.status === 'COMPLETED') {
      // 결과 이미지 추출
      const output = data.output;
      if (output?.images?.[0]?.data) {
        return output.images[0].data; // Base64 이미지
      }
      throw new Error('No image in RunPod result');
    } else if (data.status === 'FAILED') {
      throw new Error(`RunPod job failed: ${data.error}`);
    }
  }
  
  throw new Error('RunPod job timeout');
}
```

#### 메인 처리 로직 수정
```typescript
if (mode === 'i2i') {
  // RunPod API 키 확인
  const runpodApiKey = Deno.env.get('RUNPOD_API_KEY');
  const runpodEndpointId = Deno.env.get('RUNPOD_ENDPOINT_ID');
  
  if (!runpodApiKey || !runpodEndpointId) {
    throw new Error('RunPod configuration missing');
  }
  
  // 참조 이미지 필수 확인
  if (!referenceImage) {
    throw new Error('Reference image required for I2I mode');
  }
  
  // RunPod API 호출
  const resultBase64 = await callRunPodAPI(
    image,           // 타겟 이미지
    referenceImage,  // 참조 이미지
    mask,           // 마스크
    runpodApiKey,
    runpodEndpointId
  );
  
  // Base64를 Blob으로 변환
  const imageData = base64ToBlob(resultBase64);
  
  // 결과 저장...
}
```

### 3. 프론트엔드 UI 수정

#### 파일: `app/canvas/_components/ImageBrushModal.tsx`

#### State 확장
```typescript
interface ImageBrushModalState {
  // 기존 필드...
  referenceImage: string | null;  // I2I용 참조 이미지
  styleStrength: number;           // 스타일 강도 (0.5 ~ 1.5)
  isUploadingReference: boolean;   // 참조 이미지 업로드 중
}
```

#### I2I 모드 UI 추가
```tsx
{state.mode === 'i2i' && (
  <div className="space-y-4">
    {/* 참조 이미지 업로드 */}
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-gray-400">
        Reference Image (Style Source)
      </h3>
      <div 
        className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-gray-500 transition-colors"
        onDragOver={handleDragOver}
        onDrop={handleReferenceDrop}
        onClick={() => referenceInputRef.current?.click()}
      >
        {state.referenceImage ? (
          <div className="relative">
            <Image 
              src={state.referenceImage} 
              alt="Reference" 
              width={200} 
              height={200}
              className="mx-auto rounded"
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                setState(prev => ({ ...prev, referenceImage: null }));
              }}
              className="absolute top-2 right-2 p-1 bg-red-500 rounded-full"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        ) : (
          <div className="text-gray-400">
            <Upload className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Drop reference image here or click to upload</p>
            <p className="text-xs mt-1 opacity-70">
              The style/texture from this image will be applied
            </p>
          </div>
        )}
      </div>
      <input
        ref={referenceInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleReferenceUpload}
      />
    </div>

    {/* 스타일 강도 슬라이더 */}
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-gray-400">
        Style Strength
      </h3>
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-500">Weak</span>
        <input
          type="range"
          value={state.styleStrength}
          onChange={(e) => setState(prev => ({ 
            ...prev, 
            styleStrength: parseFloat(e.target.value) 
          }))}
          min={0.5}
          max={1.5}
          step={0.1}
          className="flex-1"
        />
        <span className="text-xs text-gray-500">Strong</span>
        <span className="text-sm text-gray-400 w-10 text-right">
          {state.styleStrength.toFixed(1)}
        </span>
      </div>
    </div>

    {/* I2I 모드 안내 */}
    <div className="p-3 bg-blue-900/20 border border-blue-800 rounded-lg text-sm text-blue-400">
      <p className="font-medium mb-1">I2I Mode (Style Transfer)</p>
      <ul className="text-xs space-y-1 opacity-90">
        <li>• Draw mask on areas where you want to apply the style</li>
        <li>• The texture from reference image will be applied to masked areas</li>
        <li>• No prompt needed - style is extracted from reference image</li>
      </ul>
    </div>
  </div>
)}
```

#### Generate 함수 수정
```typescript
const handleGenerate = async () => {
  // I2I 모드 검증
  if (state.mode === 'i2i' && !state.referenceImage) {
    setState(prev => ({ ...prev, error: 'Please upload a reference image for I2I mode.' }));
    return;
  }

  // API 호출 body 구성
  const requestBody: ImageBrushRequest = {
    image: imageBase64,
    mask: maskBase64,
    prompt: state.mode === 'flux' ? state.prompt : '',
    mode: state.mode,
    ...(state.mode === 'i2i' && {
      referenceImage: state.referenceImage,
      styleStrength: state.styleStrength
    })
  };

  // API 호출...
};
```

### 4. API Route 수정

#### 파일: `app/api/canvas/image-brush/route.ts`

```typescript
// 요청 검증 추가
if (body.mode === 'i2i') {
  if (!body.referenceImage) {
    return NextResponse.json(
      { error: 'Reference image is required for I2I mode.' },
      { status: 400 }
    );
  }
  
  // 참조 이미지 크기 검증
  const refImageSize = body.referenceImage.length * 0.75;
  if (refImageSize > maxSize) {
    return NextResponse.json(
      { error: 'Reference image size cannot exceed 10MB.' },
      { status: 400 }
    );
  }
}

// Edge Function 호출 시 참조 이미지 포함
const response = await fetch(edgeFunctionUrl, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    ...body,
    userId: user.id,
  }),
});
```

### 5. 타입 정의 확장

#### 파일: `types/image-brush.ts`

```typescript
export interface ImageBrushRequest {
  image: string;
  mask: string;
  prompt: string;
  mode: 'flux' | 'i2i';
  userId?: string;
  // I2I 모드 전용 필드
  referenceImage?: string;   // Base64 인코딩된 참조 이미지
  styleStrength?: number;    // 스타일 강도 (0.5 ~ 1.5)
}

export interface ImageBrushResponse {
  success: boolean;
  imageUrl?: string;
  originalImageUrl?: string;
  maskImageUrl?: string;
  referenceImageUrl?: string;  // I2I 모드에서 참조 이미지 URL
  error?: string;
  processingTime?: number;
  mode?: 'flux' | 'i2i';
}
```

### 6. 데이터베이스 마이그레이션

#### 파일: `supabase/migrations/20240120_add_i2i_fields.sql`

```sql
-- I2I 모드 지원을 위한 컬럼 추가
ALTER TABLE public.image_brush_history
ADD COLUMN reference_image_url TEXT,
ADD COLUMN style_strength DECIMAL(3,2) DEFAULT 1.0;

-- 컬럼 설명 추가
COMMENT ON COLUMN public.image_brush_history.reference_image_url 
IS 'I2I 모드에서 사용된 참조 이미지 URL (Supabase Storage)';

COMMENT ON COLUMN public.image_brush_history.style_strength 
IS 'I2I 모드에서 적용된 스타일 강도 (0.5 ~ 1.5)';

-- 인덱스 추가 (I2I 모드 필터링용)
CREATE INDEX idx_image_brush_history_mode_i2i 
ON public.image_brush_history(mode) 
WHERE mode = 'i2i';
```

### 7. 환경 변수 설정

#### Supabase Edge Function 환경 변수
```bash
# RunPod API 설정
npx supabase secrets set RUNPOD_API_KEY=your-api-key --project-ref YOUR_PROJECT_REF
npx supabase secrets set RUNPOD_ENDPOINT_ID=your-endpoint-id --project-ref YOUR_PROJECT_REF
```

#### 로컬 개발 환경 (.env.local)
```env
# RunPod API (I2I 모드용)
RUNPOD_API_KEY=your-runpod-api-key
RUNPOD_ENDPOINT_ID=your-runpod-endpoint-id
```

## 테스트 계획

### 1. 단위 테스트
- [ ] Workflow JSON 파싱 및 seed 치환
- [ ] Base64 인코딩/디코딩
- [ ] 참조 이미지 업로드 및 검증
- [ ] RunPod API 응답 처리

### 2. 통합 테스트
- [ ] 전체 I2I 워크플로우 (타겟 + 참조 + 마스크)
- [ ] RunPod API 타임아웃 처리
- [ ] 에러 복구 메커니즘
- [ ] 결과 이미지 저장 및 URL 생성

### 3. UI/UX 테스트
- [ ] 모드 전환 시 UI 변경
- [ ] 참조 이미지 드래그 앤 드롭
- [ ] 진행률 표시 정확도
- [ ] 에러 메시지 표시

### 4. 성능 테스트
- [ ] 대용량 이미지 처리 (1024x1024)
- [ ] 동시 요청 처리
- [ ] 메모리 사용량 모니터링

## 배포 체크리스트

### 1. 사전 준비
- [ ] RunPod 계정 생성 및 크레딧 충전
- [ ] Serverless Endpoint 생성
- [ ] ComfyUI 환경 설정 완료
- [ ] Workflow JSON 파일 검증

### 2. 코드 배포
- [ ] Workflow JSON 파일 생성
- [ ] Edge Function 코드 업데이트
- [ ] 환경 변수 설정
- [ ] 데이터베이스 마이그레이션 실행

### 3. 테스트
- [ ] 로컬 환경 테스트
- [ ] 스테이징 환경 테스트
- [ ] 프로덕션 smoke 테스트

### 4. 모니터링
- [ ] RunPod 대시보드 모니터링
- [ ] Supabase Edge Function 로그
- [ ] 에러 알림 설정

## 트러블슈팅

### 문제: RunPod API 인증 실패
**증상**: `401 Unauthorized` 에러
**해결**:
1. API 키 확인
2. Endpoint ID 확인
3. 환경 변수 재설정

### 문제: Workflow 실행 실패
**증상**: `FAILED` 상태 반환
**해결**:
1. Workflow JSON 구조 검증
2. 이미지 이름 매칭 확인 (input-1.png, input-2.png, mask.png)
3. 모델 파일 존재 확인

### 문제: 타임아웃
**증상**: 5분 후에도 결과 없음
**해결**:
1. RunPod 크레딧 확인
2. Endpoint 상태 확인
3. 이미지 크기 줄이기

### 문제: 마스크 적용 안 됨
**증상**: 전체 이미지에 스타일 적용
**해결**:
1. 마스크 알파 채널 확인
2. 알파값 0 = 마스크 영역
3. PNG 형식 사용 필수

## 참고 자료

### API 문서
- [RunPod API Documentation](https://docs.runpod.io/api)
- [ComfyUI Documentation](https://github.com/comfyanonymous/ComfyUI)
- [FLUX Fill Model](https://huggingface.co/black-forest-labs/FLUX.1-Fill)

### 관련 파일
- 기획서: `/docs/task/task_image_brush.md`
- 구현 예제: `/docs/features/image_brush.md`
- 배포 가이드: `/docs/features/image-brush-deployment.md`

## 예상 일정
- **1일차**: Workflow JSON 생성 및 RunPod 설정
- **2일차**: Edge Function RunPod API 통합
- **3일차**: 프론트엔드 UI 구현
- **4일차**: 통합 테스트 및 디버깅
- **5일차**: 배포 및 모니터링

## 비용 예측
- RunPod: $0.0004/초 (약 $0.024/분)
- 평균 처리 시간: 20초
- 예상 비용: $0.008/요청
- 일일 1000 요청 시: $8/일

## 향후 개선사항
1. **배치 처리**: 여러 이미지 동시 처리
2. **캐싱**: 동일한 참조 이미지 재사용
3. **프리셋**: 자주 사용하는 스타일 저장
4. **AI 추천**: 적합한 스타일 자동 추천
5. **실시간 프리뷰**: 낮은 해상도로 빠른 미리보기