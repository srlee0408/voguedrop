## 시스템 구조
```
Frontend (React) → Next.js API Route → Supabase Edge Function → RunPod API → ComfyUI
```

## 1. Edge Function 전체 코드 구조

### 파일 위치
`/supabase/functions/image-brush/index.ts`

### 주요 구성 요소

#### 1.1 Workflow 템플릿 (임베드)
```typescript
const WORKFLOW_TEMPLATE = {
  // VAE Loader - 이미지 인코딩/디코딩
  "10": {
    "inputs": {
      "vae_name": "ae.safetensors"
    },
    "class_type": "VAELoader",
    "_meta": {
      "title": "VAE 로드"
    }
  },
  
  // CLIP 모델 로드
  "11": {
    "inputs": {
      "clip_name1": "clip_l.safetensors",
      "clip_name2": "t5xxl_fp16.safetensors",
      "type": "flux",
      "device": "default"
    },
    "class_type": "DualCLIPLoader"
  },
  
  // 스타일 모델
  "173": {
    "inputs": {
      "style_model_name": "flux-redux.safetensors"
    },
    "class_type": "StyleModelLoader"
  },
  
  // 타겟 이미지 (텍스처)
  "422": {
    "inputs": {
      "image": "input-1.png",
      "upload": "image"
    },
    "class_type": "LoadImage"
  },
  
  // 참조 이미지 (스타일 소스)
  "590": {
    "inputs": {
      "image": "input-2.png",
      "upload": "image"
    },
    "class_type": "LoadImage"
  },
  
  // 마스크 이미지
  "698": {
    "inputs": {
      "image": "mask.png",
      "channel": "alpha",
      "upload": "image"
    },
    "class_type": "LoadImageMask"
  },
  
  // 프롬프트 인코딩
  "658": {
    "inputs": {
      "text": "",  // 동적으로 설정
      "clip": ["11", 0]
    },
    "class_type": "CLIPTextEncode"
  },
  
  // 스타일 적용
  "667": {
    "inputs": {
      "strength": 1,
      "strength_type": "multiply",
      "conditioning": ["660", 0],
      "style_model": ["173", 0],
      "clip_vision_output": ["662", 0]
    },
    "class_type": "StyleModelApply"
  },
  
  // KSampler - 이미지 생성
  "689": {
    "inputs": {
      "seed": 123456,  // 동적으로 설정
      "steps": 28,
      "cfg": 1,
      "sampler_name": "euler",
      "scheduler": "beta",
      "denoise": 1,
      "model": ["688", 0],
      "positive": ["661", 0],
      "negative": ["660", 1],
      "latent_image": ["660", 2]
    },
    "class_type": "KSampler"
  },
  
  // UNET 모델 로드
  "687": {
    "inputs": {
      "unet_name": "flux_fill_Q8.gguf"
    },
    "class_type": "UnetLoaderGGUF"
  }
  
  // ... 총 24개 노드
};
```

#### 1.2 Workflow 준비 함수
```typescript
function loadWorkflowJson(): any {
  // 템플릿 복사
  const workflowData = JSON.parse(JSON.stringify(WORKFLOW_TEMPLATE));
  
  // 랜덤 시드 생성
  const seed = Math.floor(Math.random() * 999999);
  
  // 시드 값 교체
  if (workflowData['689'] && workflowData['689']['inputs']) {
    workflowData['689']['inputs']['seed'] = seed;
  }
  
  return workflowData;
}
```

#### 1.3 RunPod API 호출 함수
```typescript
async function callRunPodAPI(
  textureImage: string,    // Base64 타겟 이미지
  referenceImage: string,  // Base64 참조 이미지  
  maskImage: string,       // Base64 마스크 이미지
  prompt: string,          // 텍스트 프롬프트 (선택)
  apiKey: string,          // RunPod API 키
  endpointId: string       // Endpoint ID
): Promise<string> {
  
  const startTime = Date.now();
  
  // 1. Workflow 로드 및 준비
  const workflowData = loadWorkflowJson();
  
  // 2. 프롬프트 업데이트 (있을 경우)
  if (prompt && workflowData['658']) {
    workflowData['658']['inputs']['text'] = prompt;
  }
  
  // 3. Workflow를 JSON 문자열로 변환
  const workflowString = JSON.stringify(workflowData);
  
  // 4. Request Body 구성
  const requestData = {
    input: {
      workflow: workflowString,  // ⚠️ 현재 문자열로 전송
      images: [
        {
          name: "input-1.png",
          image: textureImage.split(',')[1] || textureImage  // data:image 접두사 제거
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
  
  // 5. 디버깅 로그
  console.log('Calling RunPod API...');
  console.log('Endpoint ID:', endpointId);
  console.log('Workflow nodes:', Object.keys(workflowData).length);
  console.log('Images provided:', requestData.input.images.length);
  
  // 6. API 호출
  const RUNPOD_API_URL = `https://api.runpod.ai/v2/${endpointId}/run`;
  
  const response = await fetch(RUNPOD_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestData)
  });
  
  // 7. 에러 처리
  if (!response.ok) {
    const errorText = await response.text();
    console.error('RunPod API error:', errorText);
    throw new Error(`RunPod API error: ${response.status} - ${errorText}`);
  }
  
  // 8. Job ID 추출
  const responseData = await response.json();
  const jobId = responseData.id;
  
  if (!jobId) {
    throw new Error('No job ID received from RunPod API');
  }
  
  console.log(`RunPod job started with ID: ${jobId}`);
  
  // 9. 결과 폴링
  return await pollRunPodResult(jobId, apiKey, endpointId, startTime);
}
```

## 2. API 요청 형식

### 2.1 RunPod API 엔드포인트
```
POST https://api.runpod.ai/v2/3zf2a1riucu05o/run
```

### 2.2 Request Headers
```http
Authorization: Bearer YOUR_RUNPOD_API_KEY
Content-Type: application/json
```

### 2.3 Request Body 전체 구조
```json
{
  "input": {
    "workflow": "{\"10\":{\"inputs\":{\"vae_name\":\"ae.safetensors\"},\"class_type\":\"VAELoader\"},\"11\":{...}}",
    "images": [
      {
        "name": "input-1.png",
        "image": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
      },
      {
        "name": "input-2.png",
        "image": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
      },
      {
        "name": "mask.png",
        "image": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
      }
    ]
  }
}
```

### 2.4 Response 형식
```json
{
  "id": "a252b813-f0de-433d-9a14-dadbb7ae68e0-e2",
  "status": "IN_QUEUE"
}
```

## 3. 상태 확인 (Polling)

### 3.1 Status Check 엔드포인트
```
GET https://api.runpod.ai/v2/3zf2a1riucu05o/status/{jobId}
```

### 3.2 Status Response
```json
{
  "status": "COMPLETED",
  "output": {
    "images": [
      {
        "data": "base64_encoded_result_image"
      }
    ]
  }
}
```

### 3.3 가능한 상태값
- `IN_QUEUE`: 대기 중
- `IN_PROGRESS`: 처리 중
- `COMPLETED`: 완료
- `FAILED`: 실패

## 4. 현재 발생하는 에러

### 4.1 500 Internal Server Error
```json
{
  "success": false,
  "error": "RunPod job failed: Error queuing workflow: HTTP Error 500: Internal Server Error"
}
```

### 4.2 가능한 원인
1. **ComfyUI 모델 누락**
   - flux_fill_Q8.gguf
   - flux-redux.safetensors
   - ae.safetensors
   - clip_l.safetensors
   - t5xxl_fp16.safetensors

2. **Workflow 형식 문제**
   - 현재: JSON 문자열로 전송
   - 대안: JSON 객체로 전송

3. **GPU 메모리 부족**
   - 필요 메모리: 최소 24GB
   - 권장: RTX 3090 이상

4. **노드 연결 오류**
   - 입력/출력 매핑 불일치
   - 필수 노드 누락

## 5. 환경 변수 설정

### 5.1 로컬 환경 (.env.local)
```env
RUNPOD_API_KEY=your-runpod-api-key
RUNPOD_ENDPOINT_ID=3zf2a1riucu05o
```

### 5.2 Supabase Edge Function
```bash
# API 키 설정
npx supabase secrets set RUNPOD_API_KEY=your-key \
  --project-ref snqyygrpybwhihektxxy

# Endpoint ID 설정
npx supabase secrets set RUNPOD_ENDPOINT_ID=3zf2a1riucu05o \
  --project-ref snqyygrpybwhihektxxy

# 확인
npx supabase secrets list --project-ref snqyygrpybwhihektxxy
```

## 6. 테스트 방법

### 6.1 Health Check
```bash
curl -X GET https://api.runpod.ai/v2/3zf2a1riucu05o/health \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### 6.2 간단한 테스트 요청
```bash
curl -X POST https://api.runpod.ai/v2/3zf2a1riucu05o/run \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "workflow": {},
      "images": []
    }
  }'
```

### 6.3 Edge Function 로그 확인
```bash
npx supabase functions logs image-brush \
  --project-ref snqyygrpybwhihektxxy \
  --tail
```

## 7. 디버깅 체크리스트

- [ ] RunPod Dashboard에서 Worker 상태 확인
- [ ] Endpoint에 최소 1개의 Worker 실행 중
- [ ] 크레딧 잔액 충분
- [ ] 필요한 모델이 모두 설치됨
- [ ] GPU 메모리 충분 (24GB+)
- [ ] Workflow 형식 확인 (문자열 vs 객체)
- [ ] 이미지 Base64 인코딩 올바름
- [ ] 환경 변수 설정 완료

## 8. 참고 자료

- [RunPod Documentation](https://docs.runpod.io/serverless/endpoints/job-operations)
- [ComfyUI GitHub](https://github.com/comfyanonymous/ComfyUI)
- [프로젝트 관련 문서](/docs/task/task_i2i_implementation.md)

---

*이 문서는 RunPod 지원팀과 공유하기 위해 작성되었습니다.*
*최종 업데이트: 2025-08-20*