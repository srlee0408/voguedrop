# Canvas AI 영상 생성 기능 구현 문서 (MVP)

## MVP 핵심 원칙
- **Simple is Better**: 가장 간단한 방법으로 구현
- **Direct API Calls**: 큐 시스템 없이 직접 API 호출
- **Minimal Infrastructure**: 추가 인프라 최소화

## 기능 요구사항 (그대로 유지)
1. 이미지 업로드 (1장)
2. 효과/카메라/모델 선택 (각 카테고리에서 선택, 최대 4개 조합)
3. 영상 생성 (fal.ai Seedance/Hailo)
4. 생성된 영상 표시 (최대 3개)
5. 우측 패널 영상 로그
6. 다운로드 기능

## 간소화된 구현 방식

### 1. Next.js API Routes 직접 사용
```typescript
// app/api/canvas/generate/route.ts
export async function POST(request: Request) {
  const body = await request.json();
  
  // 1. DB에 생성 요청 저장 (pending 상태)
  const generation = await saveGeneration(body);
  
  // 2. fal.ai 직접 호출 (30-60초 소요)
  try {
    const videoUrl = await generateWithFal(body);
    
    // 3. 성공시 DB 업데이트
    await updateGeneration(generation.id, {
      status: 'completed',
      videoUrl
    });
    
    return Response.json({ 
      success: true, 
      generationId: generation.id,
      videoUrl 
    });
    
  } catch (error) {
    // 4. 실패시 에러 처리
    await updateGeneration(generation.id, {
      status: 'failed',
      error: error.message
    });
    
    return Response.json({ 
      success: false, 
      error: '영상 생성 실패' 
    }, { status: 500 });
  }
}
```

### 2. 클라이언트 처리 방식
```typescript
// 영상 생성 요청
const generateVideo = async () => {
  setIsGenerating(true);
  
  const response = await fetch('/api/canvas/generate', {
    method: 'POST',
    body: JSON.stringify({
      userId: session?.user?.id || 'anonymous',
      imageUrl: uploadedImage,
      selectedEffects,
      modelType: 'seedance'
    })
  });
  
  const data = await response.json();
  
  if (data.success) {
    // 성공시 영상 표시
    setGeneratedVideos(prev => [data.videoUrl, ...prev].slice(0, 3));
  } else {
    // 실패시 에러 표시
    toast.error(data.error);
  }
  
  setIsGenerating(false);
};
```

### 3. 이미지 업로드 간소화
```typescript
// app/api/canvas/upload/route.ts
export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get('file') as File;
  
  // Supabase Storage에 직접 업로드
  const fileName = `${Date.now()}_${file.name}`;
  const { data, error } = await supabase.storage
    .from('media-asset')
    .upload(`temp/${fileName}`, file);
  
  if (error) throw error;
  
  // Public URL 반환
  const publicUrl = supabase.storage
    .from('media-asset')
    .getPublicUrl(`temp/${fileName}`).data.publicUrl;
  
  return Response.json({ url: publicUrl });
}
```

## 데이터베이스 스키마 (기존 활용 + 최소 추가)

```sql
-- 기존 테이블 그대로 활용
-- categories, media_assets, creations

-- 효과 템플릿 (신규)
CREATE TABLE public.effect_templates (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  category_id bigint NOT NULL REFERENCES public.categories(id),
  prompt text NOT NULL,
  preview_media_id bigint REFERENCES public.media_assets(id),
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true
);

-- 영상 생성 기록 (간소화)
CREATE TABLE public.video_generations (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id text NOT NULL DEFAULT 'anonymous', -- 인증 없이도 사용 가능
  source_image_url text NOT NULL,
  selected_effects jsonb NOT NULL,
  combined_prompt text NOT NULL,
  model_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  result_video_url text,
  error_message text,
  created_at timestamp with time zone DEFAULT now()
);
```

## 컴포넌트 구조

### Canvas 페이지 레이아웃
```typescript
// app/canvas/page.tsx
export default function CanvasPage() {
  return (
    <div className="flex h-screen">
      {/* 좌측: 프롬프터 섹션 */}
      <div className="w-80 border-r">
        <PrompterSection onEffectSelect={handleEffectSelect} />
      </div>
      
      {/* 중앙: 메인 작업 영역 */}
      <div className="flex-1 flex flex-col">
        <QuickActionsBar onGenerate={handleGenerate} />
        <div className="flex-1 grid grid-cols-2 gap-4 p-4">
          <ImageSection onImageUpload={handleImageUpload} />
          <EffectsSection selectedEffects={selectedEffects} />
        </div>
      </div>
      
      {/* 우측: 히스토리 패널 */}
      <div className="w-80 border-l">
        <VideoLogPanel />
      </div>
    </div>
  );
}
```

## fal.ai 통합 (간단 버전)

```typescript
// lib/fal-ai.ts
import * as fal from "@fal-ai/serverless-client";

// 서버사이드 전용
if (typeof window === 'undefined') {
  fal.config({
    credentials: process.env.FAL_API_KEY
  });
}

export async function generateVideo(
  imageUrl: string,
  prompt: string,
  modelType: 'seedance' | 'hailo' = 'seedance'
) {
  const model = modelType === 'seedance' 
    ? "fal-ai/fast-sdxl/image-to-video"  // 실제 모델명 확인 필요
    : "fal-ai/hailo";
    
  const result = await fal.run(model, {
    input: {
      image_url: imageUrl,
      prompt: prompt,
      // 기본 파라미터
      num_frames: 25,
      fps: 8,
      motion_strength: 0.7
    }
  });
  
  return result.video.url;
}
```

## 구현 순서 (2주 MVP)

### Week 1: 기본 기능
1. **Day 1-2**: DB 세팅 & 효과 템플릿 데이터
   ```sql
   -- 카테고리 추가
   INSERT INTO categories (name) VALUES ('effect'), ('camera'), ('model');
   
   -- 효과 템플릿 예시
   INSERT INTO effect_templates (name, category_id, prompt) VALUES
   ('Zoom In', 2, 'camera slowly zooming in'),
   ('Dreamy', 1, 'dreamy ethereal atmosphere'),
   ('Fashion Walk', 3, 'model walking on runway');
   ```

2. **Day 3-4**: API Routes
   - `/api/canvas/effects` - 효과 목록
   - `/api/canvas/upload` - 이미지 업로드
   - `/api/canvas/generate` - 영상 생성
   - `/api/canvas/history` - 생성 기록

3. **Day 5-7**: UI 컴포넌트 구현
   - 각 섹션별 컴포넌트
   - 상태 관리 (useState)

### Week 2: 통합 및 개선
1. **Day 8-9**: fal.ai 연동 및 테스트
2. **Day 10-11**: 에러 처리 및 로딩 상태
3. **Day 12-13**: 다운로드 기능 추가
4. **Day 14**: 최종 테스트 및 배포

## 주요 차이점 (원본 대비)

1. **동기식 처리**: 백그라운드 작업 대신 API Route에서 직접 처리
2. **폴링 제거**: 생성 완료까지 대기 (로딩 표시)
3. **인증 선택적**: 로그인 없이도 사용 가능 (세션 기반)
4. **스토리지 간소화**: 임시 폴더 사용, 정리는 나중에

## 예상 문제 및 해결

1. **타임아웃 (30초 제한)**
   - Vercel 함수 타임아웃 60초로 설정
   - 또는 Edge Function 사용 (300초)

2. **동시 요청 처리**
   - 클라이언트에서 중복 요청 방지
   - 생성 중일 때 버튼 비활성화

3. **비용 관리**
   - 일일 한도 설정 (환경변수)
   - 생성 횟수 카운트

## 환경 변수
```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
FAL_API_KEY=

# 옵션
DAILY_GENERATION_LIMIT=100
MAX_IMAGE_SIZE_MB=5
```

이 MVP 접근법으로 2주 내에 모든 기능을 구현할 수 있습니다.