# Canvas AI 영상 생성 기능 구현 문서

## 기능 개요

VogueDrop의 Canvas 페이지에서 사용자가 이미지를 업로드하고, AI 효과를 선택하여 동영상을 생성하는 기능입니다. fal.ai의 Seedance와 Hailo 모델을 활용하여 이미지를 동영상으로 변환합니다.

## 사용자 워크플로우

1. **이미지 업로드**: 사용자가 Image 섹션에 원본 이미지 1장 업로드
2. **효과 선택**: 
   - 효과/카메라/모델 카테고리별로 갤러리 형태의 예시 영상 제공
   - 사용자가 각 카테고리에서 원하는 효과 선택
   - 최대 4개까지 효과 조합 가능
3. **효과 미리보기**: Effect 섹션에 선택한 효과들의 예시 표시
4. **영상 생성**: Generate 버튼 클릭하여 AI 영상 생성 시작
5. **결과 확인**: 
   - Image 섹션에 생성된 영상 표시 (최대 3개)
   - 우측 패널에 생성 영상 로그 표시

## 기술 스택

- **Frontend**: Next.js, React, TypeScript
- **AI API**: fal.ai (Seedance, Hailo 모델)
- **Storage**: Supabase Storage
- **Database**: Supabase (PostgreSQL)
- **인증**: Supabase Auth

## 데이터베이스 스키마

### 기존 테이블 활용

```sql
-- categories 테이블: 효과/카메라/모델 카테고리 저장
-- 'effect', 'camera', 'model' 카테고리 추가 필요

-- media_assets 테이블: 
-- 1. 효과별 예시 영상 저장
-- 2. 사용자가 업로드한 원본 이미지 저장
-- 3. AI가 생성한 결과 영상 저장

-- creations 테이블: 
-- AI 영상 생성 결과물 메타데이터 저장
-- prompt 필드에 조합된 효과 프롬프트 저장
```

### 신규 테이블 필요

```sql
-- 효과 템플릿 테이블 (효과/카메라/모델의 옵션들)
CREATE TABLE public.effect_templates (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  category_id bigint NOT NULL REFERENCES public.categories(id),
  prompt text NOT NULL, -- fal.ai에 전달할 프롬프트
  preview_media_id bigint REFERENCES public.media_assets(id), -- 예시 영상
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- 사용자별 영상 생성 요청 기록
CREATE TABLE public.video_generations (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  source_image_id bigint NOT NULL REFERENCES public.media_assets(id), -- 원본 이미지
  creation_id bigint REFERENCES public.creations(id), -- 생성 완료시 연결
  selected_effects jsonb NOT NULL, -- 선택한 effect_template id 배열
  combined_prompt text NOT NULL, -- 조합된 최종 프롬프트
  model_type text NOT NULL CHECK (model_type IN ('seedance', 'hailo')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message text,
  fal_job_id text, -- fal.ai 작업 ID
  created_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone
);

-- 인덱스 추가
CREATE INDEX idx_video_generations_user_id ON public.video_generations(user_id);
CREATE INDEX idx_video_generations_status ON public.video_generations(status);
CREATE INDEX idx_effect_templates_category ON public.effect_templates(category_id);
```

## API 구조

### 1. Effect Templates API

```typescript
// /lib/api/canvas/effects.ts
import { createClient } from '@/lib/supabase';
import { getPublicUrl } from '@/lib/supabase';

export interface EffectTemplate {
  id: number;
  name: string;
  categoryId: number;
  categoryName: string;
  prompt: string;
  previewVideoUrl: string | null;
  displayOrder: number;
}

// 카테고리별 효과 템플릿 조회
export async function getEffectTemplatesByCategory(
  categoryName: 'effect' | 'camera' | 'model'
): Promise<EffectTemplate[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('effect_templates')
    .select(`
      id,
      name,
      prompt,
      display_order,
      category:categories!inner(id, name),
      preview_media:media_assets(storage_path)
    `)
    .eq('categories.name', categoryName)
    .eq('is_active', true)
    .order('display_order');

  if (error) throw error;

  return data.map(item => ({
    id: item.id,
    name: item.name,
    categoryId: item.category.id,
    categoryName: item.category.name,
    prompt: item.prompt,
    previewVideoUrl: item.preview_media ? 
      getPublicUrl(item.preview_media.storage_path) : null,
    displayOrder: item.display_order
  }));
}

// 선택한 효과들의 프롬프트 조합
export function combineEffectPrompts(effects: EffectTemplate[]): string {
  return effects.map(effect => effect.prompt).join(', ');
}
```

### 2. Video Generation API

```typescript
// /lib/api/canvas/video-generation.ts
import { createClient } from '@/lib/supabase';
import { generateSeedanceVideo, generateHailoVideo } from '@/lib/fal-ai';

export interface VideoGenerationRequest {
  userId: string;
  sourceImageId: number;
  selectedEffectIds: number[];
  modelType: 'seedance' | 'hailo';
}

export interface VideoGenerationResponse {
  generationId: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  error?: string;
}

// 영상 생성 요청
export async function requestVideoGeneration(
  request: VideoGenerationRequest
): Promise<VideoGenerationResponse> {
  const supabase = createClient();
  
  // 1. 선택한 효과들 조회
  const { data: effects } = await supabase
    .from('effect_templates')
    .select('prompt')
    .in('id', request.selectedEffectIds);
  
  // 2. 프롬프트 조합
  const combinedPrompt = effects
    .map(e => e.prompt)
    .join(', ');
  
  // 3. 생성 요청 기록 저장
  const { data: generation, error } = await supabase
    .from('video_generations')
    .insert({
      user_id: request.userId,
      source_image_id: request.sourceImageId,
      selected_effects: request.selectedEffectIds,
      combined_prompt: combinedPrompt,
      model_type: request.modelType,
      status: 'pending'
    })
    .select()
    .single();
  
  if (error) throw error;
  
  // 4. 백그라운드에서 영상 생성 시작
  processVideoGeneration(generation.id);
  
  return {
    generationId: generation.id,
    status: 'pending'
  };
}

// 백그라운드 영상 생성 처리
async function processVideoGeneration(generationId: number) {
  const supabase = createClient();
  
  try {
    // 1. 생성 요청 정보 조회
    const { data: generation } = await supabase
      .from('video_generations')
      .select(`
        *,
        source_image:media_assets!source_image_id(storage_path)
      `)
      .eq('id', generationId)
      .single();
    
    // 2. 상태를 processing으로 업데이트
    await supabase
      .from('video_generations')
      .update({ status: 'processing' })
      .eq('id', generationId);
    
    // 3. fal.ai로 영상 생성
    const sourceImageUrl = getPublicUrl(generation.source_image.storage_path);
    let videoUrl: string;
    
    if (generation.model_type === 'seedance') {
      videoUrl = await generateSeedanceVideo(
        sourceImageUrl,
        generation.combined_prompt
      );
    } else {
      videoUrl = await generateHailoVideo(
        sourceImageUrl,
        generation.combined_prompt
      );
    }
    
    // 4. 생성된 영상을 Supabase Storage에 저장
    const videoPath = await saveGeneratedVideo(
      videoUrl,
      generation.user_id,
      generationId
    );
    
    // 5. media_assets에 영상 정보 저장
    const { data: mediaAsset } = await supabase
      .from('media_assets')
      .insert({
        storage_path: videoPath,
        file_name: `generated_${generationId}.mp4`,
        media_type: 'video'
      })
      .select()
      .single();
    
    // 6. creations에 결과물 저장
    const { data: creation } = await supabase
      .from('creations')
      .insert({
        title: `AI Generated Video ${new Date().toISOString()}`,
        prompt: generation.combined_prompt,
        category_id: 1, // TODO: 적절한 카테고리 ID
        product_id: mediaAsset.id
      })
      .select()
      .single();
    
    // 7. 생성 완료 상태 업데이트
    await supabase
      .from('video_generations')
      .update({
        status: 'completed',
        creation_id: creation.id,
        completed_at: new Date().toISOString()
      })
      .eq('id', generationId);
    
  } catch (error) {
    // 에러 발생시 상태 업데이트
    await supabase
      .from('video_generations')
      .update({
        status: 'failed',
        error_message: error.message
      })
      .eq('id', generationId);
  }
}

// 생성 상태 조회
export async function getGenerationStatus(
  generationId: number
): Promise<VideoGenerationResponse> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('video_generations')
    .select(`
      status,
      error_message,
      creation:creations(
        product:media_assets!product_id(storage_path)
      )
    `)
    .eq('id', generationId)
    .single();
  
  if (error) throw error;
  
  return {
    generationId,
    status: data.status,
    videoUrl: data.creation?.product ? 
      getPublicUrl(data.creation.product.storage_path) : undefined,
    error: data.error_message
  };
}

// 사용자의 생성 히스토리 조회
export async function getUserGenerationHistory(
  userId: string,
  limit = 20,
  offset = 0
) {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('video_generations')
    .select(`
      *,
      source_image:media_assets!source_image_id(storage_path),
      creation:creations(
        product:media_assets!product_id(storage_path)
      )
    `)
    .eq('user_id', userId)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  
  if (error) throw error;
  
  return data.map(item => ({
    id: item.id,
    sourceImageUrl: getPublicUrl(item.source_image.storage_path),
    videoUrl: item.creation?.product ? 
      getPublicUrl(item.creation.product.storage_path) : null,
    createdAt: item.created_at,
    modelType: item.model_type
  }));
}
```

### 3. Storage 관리

```typescript
// /lib/api/canvas/storage.ts
import { createClient } from '@/lib/supabase';

// 사용자별 스토리지 경로 생성
export function getUserStoragePath(
  userId: string, 
  type: 'source' | 'generated'
): string {
  return `${userId}/${type}`;
}

// 이미지 업로드
export async function uploadSourceImage(
  file: File,
  userId: string
): Promise<number> {
  const supabase = createClient();
  
  // 1. 파일 유효성 검사
  if (!['image/jpeg', 'image/png'].includes(file.type)) {
    throw new Error('JPG, PNG 형식만 지원됩니다.');
  }
  
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('파일 크기는 10MB 이하여야 합니다.');
  }
  
  // 2. Storage에 업로드
  const fileName = `${Date.now()}_${file.name}`;
  const storagePath = `${getUserStoragePath(userId, 'source')}/${fileName}`;
  
  const { error: uploadError } = await supabase.storage
    .from('media-asset')
    .upload(storagePath, file);
  
  if (uploadError) throw uploadError;
  
  // 3. media_assets 테이블에 기록
  const { data, error } = await supabase
    .from('media_assets')
    .insert({
      storage_path: storagePath,
      file_name: fileName,
      media_type: 'image'
    })
    .select()
    .single();
  
  if (error) throw error;
  
  return data.id;
}

// 생성된 영상 저장
export async function saveGeneratedVideo(
  videoUrl: string,
  userId: string,
  generationId: number
): Promise<string> {
  const supabase = createClient();
  
  // 1. 외부 URL에서 영상 다운로드
  const response = await fetch(videoUrl);
  const blob = await response.blob();
  
  // 2. Storage에 저장
  const fileName = `generation_${generationId}.mp4`;
  const storagePath = `${getUserStoragePath(userId, 'generated')}/${fileName}`;
  
  const { error } = await supabase.storage
    .from('media-asset')
    .upload(storagePath, blob);
  
  if (error) throw error;
  
  return storagePath;
}

// 다운로드 URL 생성
export async function getVideoDownloadUrl(
  videoPath: string
): Promise<string> {
  const supabase = createClient();
  
  const { data } = supabase.storage
    .from('media-asset')
    .getPublicUrl(videoPath, {
      download: true
    });
  
  return data.publicUrl;
}
```

### 4. fal.ai 연동

```typescript
// /lib/fal-ai/client.ts
import * as fal from "@fal-ai/serverless-client";

// 서버 사이드에서만 실행
if (typeof window === 'undefined') {
  fal.config({
    credentials: process.env.FAL_API_KEY
  });
}

export { fal };

// /lib/fal-ai/models.ts
import { fal } from './client';

// Seedance 모델
export async function generateSeedanceVideo(
  imageUrl: string,
  prompt: string
): Promise<string> {
  const result = await fal.run("fal-ai/seedance", {
    input: {
      image_url: imageUrl,
      prompt: prompt,
      num_frames: 25,
      fps: 7,
      seed: -1
    }
  });
  
  return result.video.url;
}

// Hailo 모델
export async function generateHailoVideo(
  imageUrl: string,
  prompt: string
): Promise<string> {
  const result = await fal.run("fal-ai/hailo", {
    input: {
      image_url: imageUrl,
      prompt: prompt,
      duration: 4,
      aspect_ratio: "16:9"
    }
  });
  
  return result.video.url;
}
```

## 컴포넌트 구조 업데이트

### 1. ImageSection 컴포넌트

```typescript
// /app/canvas/_components/ImageSection.tsx
interface ImageSectionProps {
  onImageUpload: (imageId: number) => void;
  generatedVideos: GeneratedVideo[];
  isGenerating: boolean;
}

// 주요 기능:
// - 이미지 드래그 앤 드롭 업로드
// - 업로드 진행률 표시
// - 생성된 영상 최대 3개 표시
// - "Generating..." 로딩 애니메이션
// - 영상 미리보기 및 다운로드
```

### 2. PrompterSection 컴포넌트

```typescript
// /app/canvas/_components/PrompterSection.tsx
interface PrompterSectionProps {
  onEffectSelect: (effect: EffectTemplate) => void;
  selectedEffects: EffectTemplate[];
}

// 주요 기능:
// - 3개 탭 (효과, 카메라, 모델)
// - 각 탭별 예시 영상 갤러리
// - 호버시 영상 자동 재생
// - 선택 상태 표시
// - 스켈레톤 로딩
```

### 3. EffectsSection 컴포넌트

```typescript
// /app/canvas/_components/EffectsSection.tsx
interface EffectsSectionProps {
  selectedEffects: EffectTemplate[];
  onEffectRemove: (effectId: number) => void;
  onEffectReorder: (effects: EffectTemplate[]) => void;
}

// 주요 기능:
// - 선택한 효과 카드 표시 (최대 4개)
// - X 버튼으로 효과 제거
// - 드래그 앤 드롭으로 순서 변경
// - 빈 슬롯 표시
```

### 4. VideoLogPanel 컴포넌트 (신규)

```typescript
// /app/canvas/_components/VideoLogPanel.tsx
interface VideoLogPanelProps {
  userId: string;
}

// 주요 기능:
// - 생성된 영상 히스토리 표시
// - 무한 스크롤
// - 다운로드 버튼
// - 생성 시간 표시
// - 영상 호버 미리보기
```

## 보안 및 권한

### RLS 정책

```sql
-- effect_templates: 모든 사용자 읽기 가능
ALTER TABLE public.effect_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read effect templates" 
ON public.effect_templates FOR SELECT 
USING (true);

-- video_generations: 사용자별 접근 제한
ALTER TABLE public.video_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own generations" 
ON public.video_generations FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own generations" 
ON public.video_generations FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Storage 정책은 STORAGE_BUCKET_SETUP.md 참조
```

## 구현 우선순위

### Phase 1: 기본 기능 (1주)
1. [ ] DB 스키마 생성 및 마이그레이션
2. [ ] Effect Templates 시드 데이터 입력
3. [ ] 이미지 업로드 API 및 UI
4. [ ] 효과 선택 갤러리 UI
5. [ ] fal.ai Seedance 연동
6. [ ] 영상 생성 및 표시

### Phase 2: 사용자 경험 개선 (1주)
1. [ ] 생성 진행 상태 실시간 업데이트
2. [ ] 에러 처리 및 재시도
3. [ ] 영상 로그 패널
4. [ ] 다운로드 기능
5. [ ] Hailo 모델 추가

### Phase 3: 고급 기능 (2주)
1. [ ] 효과 순서 드래그 앤 드롭
2. [ ] 커스텀 프롬프트 입력
3. [ ] 배치 생성 (여러 효과 조합 동시 생성)
4. [ ] 생성 영상 갤러리 공유

## 에러 처리

```typescript
// 에러 메시지 상수
export const ERROR_MESSAGES = {
  UPLOAD_FAILED: '이미지 업로드에 실패했습니다. 다시 시도해주세요.',
  GENERATION_FAILED: '영상 생성에 실패했습니다. 다시 시도해주세요.',
  NETWORK_ERROR: '네트워크 연결을 확인해주세요.',
  FILE_TOO_LARGE: '파일 크기는 10MB 이하여야 합니다.',
  INVALID_FORMAT: 'JPG, PNG 형식만 지원됩니다.',
  MAX_EFFECTS_REACHED: '최대 4개까지 효과를 선택할 수 있습니다.',
  NO_EFFECTS_SELECTED: '최소 1개 이상의 효과를 선택해주세요.'
};
```

## 성능 최적화

1. **이미지 최적화**
   - 클라이언트: 업로드 전 브라우저에서 리사이징
   - 서버: Sharp를 사용한 이미지 최적화

2. **비디오 스트리밍**
   - HLS 스트리밍 지원
   - 썸네일 자동 생성

3. **캐싱 전략**
   - Effect Templates: 24시간 캐싱
   - 생성된 영상: CDN 캐싱

4. **API 최적화**
   - 배치 요청 지원
   - GraphQL 고려 (향후)