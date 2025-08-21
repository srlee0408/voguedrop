# Image Brush I2I 기능 환경 변수 설정 가이드

## 개요

Image Brush I2I 기능을 사용하기 위해서는 다음의 환경 변수들이 올바르게 설정되어야 합니다.

## 필수 환경 변수

### 1. BFL (BlackForestLabs) FLUX Fill API

```bash
# FLUX Fill API 토큰 (flux 모드용)
BFL_TOKEN=your-bfl-api-token
```

**설정 방법:**
1. [BlackForestLabs](https://blackforestlabs.ai) 에서 계정 생성
2. API 토큰 발급
3. `.env` 파일 또는 Supabase Edge Functions 환경 변수에 설정

### 2. RunPod I2I API (필수 - I2I 모드용)

```bash
# RunPod API 키
RUNPOD_API_KEY=your-runpod-api-key

# RunPod 엔드포인트 ID
RUNPOD_ENDPOINT_ID=your-endpoint-id
```

**설정 방법:**
1. [RunPod](https://runpod.io) 계정 생성
2. ComfyUI 기반 I2I 워크플로우 엔드포인트 생성
3. API 키와 엔드포인트 ID 확인
4. Supabase Edge Functions 환경 변수에 설정

### 3. Supabase 설정 (기존)

```bash
# Supabase URL
SUPABASE_URL=https://your-project.supabase.co

# Supabase 익명 키 (클라이언트용)
SUPABASE_ANON_KEY=your-anon-key

# Supabase 서비스 키 (서버용)
SUPABASE_SERVICE_ROLE_KEY=your-service-key
```

## 선택적 환경 변수

### RunPod 고급 설정

```bash
# RunPod 최대 대기 시간 (초, 기본값: 480초 = 8분)
RUNPOD_MAX_TIMEOUT=480

# Cold Start 감지 임계값 (초, 기본값: 30초)
RUNPOD_COLD_START_THRESHOLD=30

# 경고 임계값 (초, 기본값: 120초 = 2분)
RUNPOD_WARNING_THRESHOLD=120

# 극단적 대기 시간 임계값 (초, 기본값: 240초 = 4분)
RUNPOD_EXTREME_WAIT_THRESHOLD=240
```

### BFL 고급 설정

```bash
# BFL API 최대 대기 시간 (초, 기본값: 120초 = 2분)
BFL_MAX_TIMEOUT=120

# BFL 가이던스 값 (기본값: 30)
BFL_DEFAULT_GUIDANCE=30

# BFL 안전성 허용도 (기본값: 2)
BFL_SAFETY_TOLERANCE=2
```

## 환경별 설정 가이드

### 1. 로컬 개발 환경

`.env.local` 파일에 설정:

```bash
# 개발용 설정
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# AI 서비스 토큰
BFL_TOKEN=your-bfl-token
RUNPOD_API_KEY=your-runpod-key
RUNPOD_ENDPOINT_ID=your-endpoint-id

# Mock 모드 (개발 시 AI API 호출 없이 테스트)
NEXT_PUBLIC_MOCK_MODE=false
```

### 2. Supabase Edge Functions 환경

Supabase 대시보드 → Functions → Secrets에서 설정:

```bash
BFL_TOKEN=your-bfl-token
RUNPOD_API_KEY=your-runpod-key  
RUNPOD_ENDPOINT_ID=your-endpoint-id
RUNPOD_MAX_TIMEOUT=480
RUNPOD_COLD_START_THRESHOLD=30
```

**설정 명령어 (CLI):**
```bash
# Supabase CLI를 사용한 환경 변수 설정
npx supabase secrets set BFL_TOKEN=your-bfl-token
npx supabase secrets set RUNPOD_API_KEY=your-runpod-key
npx supabase secrets set RUNPOD_ENDPOINT_ID=your-endpoint-id
```

### 3. Vercel 프로덕션 환경

Vercel 대시보드 → Settings → Environment Variables에서 설정:

```bash
# Next.js API Routes용
SUPABASE_SERVICE_ROLE_KEY=your-service-key
NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL=https://your-project.supabase.co/functions/v1

# Mock 모드 비활성화
NEXT_PUBLIC_MOCK_MODE=false
```

## RunPod 엔드포인트 설정 가이드

### 1. RunPod 엔드포인트 생성

**요구사항:**
- GPU: NVIDIA RTX 4090 이상 권장
- VRAM: 24GB 이상
- Storage: 50GB 이상

**템플릿:**
```yaml
# runpod-template.yml
name: "VogueDrop I2I Endpoint"
image: "runpod/pytorch:2.1.0-py3.10-cuda11.8.0-devel-ubuntu22.04"
gpu_types: ["RTX4090", "RTX3090", "A6000"]
min_gpu_count: 1
max_gpu_count: 1
container_disk_in_gb: 50
volume_in_gb: 100
env_vars:
  - name: "MODEL_CACHE_DIR"
    value: "/workspace/models"
```

### 2. ComfyUI 워크플로우 설정

엔드포인트에서 사용되는 모델 파일들:

```bash
# 필수 모델 파일들
models/vae/ae.safetensors
models/clip/clip_l.safetensors  
models/clip/t5xxl_fp16.safetensors
models/style_models/flux-redux.safetensors
models/unet/flux_fill_Q8.gguf
models/clip_vision/sigclip_vision_patch14_384.safetensors
```

### 3. 엔드포인트 테스트

```bash
# 엔드포인트 상태 확인
curl -X GET \
  "https://api.runpod.ai/v2/{ENDPOINT_ID}/health" \
  -H "Authorization: Bearer {API_KEY}"

# 테스트 작업 실행
curl -X POST \
  "https://api.runpod.ai/v2/{ENDPOINT_ID}/run" \
  -H "Authorization: Bearer {API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "workflow": "{}",
      "images": []
    }
  }'
```

## 트러블슈팅

### 1. JSON 파싱 오류

**증상:** `Unexpected token '<', "<html>..."... is not valid JSON`

**원인:**
- RunPod 또는 BFL API가 JSON 대신 HTML 오류 페이지 반환
- 잘못된 API 키 또는 엔드포인트 ID
- API 서버 다운 또는 네트워크 오류
- Edge Function URL이 잘못 설정됨

**해결 방법:**

1. **환경 변수 확인:**
```bash
# Supabase Edge Functions 환경 변수 확인
npx supabase secrets list

# 필수 환경 변수가 설정되었는지 확인
- BFL_TOKEN
- RUNPOD_API_KEY  
- RUNPOD_ENDPOINT_ID
```

2. **RunPod 엔드포인트 상태 확인:**
```bash
# 엔드포인트가 정상 작동하는지 확인
curl -X GET \
  "https://api.runpod.ai/v2/{ENDPOINT_ID}/health" \
  -H "Authorization: Bearer {API_KEY}"
```

3. **BFL API 토큰 유효성 확인:**
```bash
# BFL 토큰이 유효한지 확인
curl -X GET \
  "https://api.bfl.ml/v1/models" \
  -H "X-Key: {BFL_TOKEN}"
```

4. **Edge Function 로그 확인:**
```bash
# 실시간 로그 모니터링
npx supabase functions logs image-brush --tail

# 최근 100개 로그 확인
npx supabase functions logs image-brush --limit 100
```

5. **디버깅 팁:**
- Edge Function이 HTML을 반환하면 보통 404 또는 500 오류
- RunPod가 HTML을 반환하면 엔드포인트 ID가 잘못됨
- BFL이 HTML을 반환하면 API 키가 잘못되거나 만료됨

### 2. BFL API 오류

**증상:** `BFL API error: 401 - Unauthorized`
**해결:** BFL_TOKEN이 올바른지 확인

**증상:** `BFL API error: 429 - Too Many Requests`
**해결:** API 사용량 한도 확인, 잠시 후 재시도

### 2. RunPod 오류

**증상:** `RunPod API error: 404 - Endpoint not found`
**해결:** RUNPOD_ENDPOINT_ID가 올바른지 확인

**증상:** `Cold start timeout`
**해결:** 
- RUNPOD_MAX_TIMEOUT 증가 (600초 이상)
- 엔드포인트의 Min Workers 설정 확인

**증상:** `No available workers`
**해결:**
- 엔드포인트의 Max Workers 설정 증가
- GPU 유형 확인 및 변경

### 3. 일반적인 오류

**증상:** `Environment variable not found`
**해결:** 
1. `.env.local` 파일 확인
2. Supabase Functions Secrets 확인
3. 환경 변수명 오타 확인

**증상:** `Image processing timeout`
**해결:**
1. 이미지 크기 최적화 (2MB 이하)
2. 프롬프트 단순화
3. 타임아웃 설정 증가

## 모니터링 및 알림

### 1. 로깅 설정

```bash
# 로그 레벨 설정
LOG_LEVEL=debug  # debug, info, warn, error

# RunPod 상세 로깅
RUNPOD_DEBUG_LOGGING=true

# BFL 요청 로깅
BFL_DEBUG_LOGGING=true
```

### 2. 성능 메트릭

추적하는 메트릭:
- Cold Start 빈도 및 시간
- 평균 처리 시간
- API 오류율
- 큐 대기 시간

### 3. 알림 설정

```bash
# Slack 웹훅 (선택적)
SLACK_WEBHOOK_URL=https://hooks.slack.com/...

# 이메일 알림 임계값
ERROR_RATE_THRESHOLD=0.05  # 5%
RESPONSE_TIME_THRESHOLD=300  # 5분
```

## 성능 최적화 팁

### 1. RunPod 최적화

- **Min Workers 설정:** 최소 1개 유지하여 Cold Start 방지
- **GPU 선택:** RTX 4090 > RTX 3090 > A6000 순으로 성능 우수
- **지역 선택:** 사용자와 가까운 지역 선택

### 2. 워크플로우 최적화

- **모델 캐싱:** 자주 사용하는 모델을 메모리에 유지
- **이미지 리사이즈:** 1024px 이하로 제한
- **Steps 조정:** 품질과 속도의 균형 (기본값: 28)

### 3. 비용 최적화

- **Auto-scaling 설정:** 사용량에 따라 Workers 수 자동 조정
- **Spot Instance 활용:** 비용 절감 (가용성 주의)
- **사용량 모니터링:** 일일/월간 비용 추적

## 보안 고려사항

### 1. API 키 관리

- **환경 변수만 사용:** 코드에 하드코딩 금지
- **키 교체 주기:** 3개월마다 교체 권장
- **접근 권한 최소화:** 필요한 권한만 부여

### 2. 네트워크 보안

- **HTTPS 사용:** 모든 API 통신 암호화
- **IP 허용 목록:** 필요시 RunPod 엔드포인트 IP 제한
- **레이트 리미팅:** 과도한 요청 방지

### 3. 데이터 보호

- **이미지 암호화:** 민감한 이미지 업로드 시 암호화
- **임시 파일 정리:** 처리 완료 후 임시 파일 삭제
- **로그 마스킹:** API 키 등 민감 정보 로그에서 제외

---

**업데이트 일시:** 2024-11-21  
**버전:** 1.0  
**담당:** VogueDrop 개발팀