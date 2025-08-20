# RunPod I2I Integration Guide

## 개요
Image Brush의 I2I (Image-to-Image) 모드는 RunPod Serverless API를 통해 ComfyUI workflow를 실행하여 스타일 전송을 수행합니다.

## RunPod API 요청 형식

### 1. Workflow 준비
```typescript
// workflow.json을 로드하고 seed 값 교체
const workflowData = loadWorkflowJson();
const seed = Math.floor(Math.random() * 999999);
workflowData['689']['inputs']['seed'] = seed;

// 프롬프트 업데이트 (선택사항)
if (prompt) {
  workflowData['658']['inputs']['text'] = prompt;
}
```

### 2. Request Data 구조
```typescript
const requestData = {
  input: {
    workflow: JSON.stringify(workflowData),  // workflow는 JSON 문자열로 전송
    images: [
      {
        name: "input-1.png",     // 타겟 이미지 (텍스처)
        image: base64ImageData   // data:image/png;base64, 접두사 제거
      },
      {
        name: "input-2.png",     // 참조 이미지 (스타일 소스)
        image: base64ImageData
      },
      {
        name: "mask.png",        // 마스크 이미지 (알파 채널)
        image: base64MaskData
      }
    ]
  }
};
```

### 3. API 호출
```typescript
const RUNPOD_API_URL = `https://api.runpod.ai/v2/${endpointId}/run`;

const response = await fetch(RUNPOD_API_URL, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(requestData)
});
```

## Workflow 노드 구조

### 주요 노드
- **689**: KSampler - seed 값 설정
- **658**: CLIP Text Encode - 프롬프트 입력
- **422**: 텍스처 이미지 로드 (input-1.png)
- **590**: 참조 이미지 로드 (input-2.png)
- **698**: 마스크 이미지 로드 (mask.png)
- **667**: Style Model Apply - 스타일 강도 적용

## RunPod 응답 처리

### 1. Job 생성 응답
```json
{
  "id": "job-id-here",
  "status": "IN_QUEUE"
}
```

### 2. Status Polling
```typescript
const RUNPOD_STATUS_URL = `https://api.runpod.ai/v2/${endpointId}/status/${jobId}`;

// 2초마다 상태 확인
const statusResponse = await fetch(RUNPOD_STATUS_URL, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${apiKey}`
  }
});
```

### 3. 완료 응답 형식
```json
{
  "status": "COMPLETED",
  "output": {
    "images": [
      {
        "data": "base64_image_data_here"
      }
    ]
  }
}
```

### 대체 응답 형식
RunPod은 여러 출력 형식을 가질 수 있습니다:
- `output.images[0].data`: 표준 형식
- `output.images[0]`: 직접 이미지 데이터
- `output.image`: 단일 이미지
- `output`: 문자열 형태의 직접 출력

## Cold Start 처리

### 특징
- 첫 요청 시 30-60초의 모델 로딩 시간 필요
- 이후 요청은 10-20초 내 처리
- 일정 시간 미사용 시 cold 상태로 전환

### 대응 방법
1. **타임아웃 설정**: 최소 6분 이상
2. **사용자 안내**: UI에 초기화 메시지 표시
3. **로깅**: Cold start 감지 시 기록

```typescript
if (!coldStartLogged && attempts > 15 && status === 'IN_QUEUE') {
  console.log('RunPod cold start detected - model is loading');
  coldStartLogged = true;
}
```

## 에러 처리

### 일반적인 에러
1. **401 Unauthorized**: API 키 확인
2. **404 Not Found**: Endpoint ID 확인
3. **FAILED 상태**: RunPod 내부 에러
4. **Timeout**: 6분 초과 시

### 디버깅
```bash
# Edge Function 로그 확인
npx supabase functions logs image-brush --project-ref YOUR_PROJECT_REF --tail

# 주요 확인 사항
- Endpoint ID가 올바른지
- API 키가 유효한지
- Workflow가 JSON 문자열로 전송되는지
- 이미지가 Base64 형식인지
```

## 최적화 팁

1. **이미지 크기**: 512x512 ~ 1024x1024 권장
2. **Workflow 캐싱**: 템플릿을 코드에 임베드
3. **병렬 처리**: 여러 요청 시 동시 실행 제한
4. **Warm 유지**: 주기적인 health check

## 환경 변수

```env
# RunPod 설정 (필수)
RUNPOD_API_KEY=your-api-key
RUNPOD_ENDPOINT_ID=your-endpoint-id
```

## 참고 자료
- [RunPod Documentation](https://docs.runpod.io/serverless/endpoints/job-operations)
- [ComfyUI Workflow Guide](https://github.com/comfyanonymous/ComfyUI)
- [Image Brush Implementation](/docs/task/task_i2i_implementation.md)