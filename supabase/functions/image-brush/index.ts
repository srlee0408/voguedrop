// Supabase Edge Function for AI Image Brush (Inpainting)
// This function handles image editing with AI using BFL FLUX Fill API

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';
import { corsHeaders } from '../_shared/cors.ts';

// API Configuration
const BFL_API_URL = 'https://api.us1.bfl.ai/v1/flux-pro-1.0-fill';
const BFL_RESULT_URL = 'https://api.us1.bfl.ai/v1/get_result';

interface ImageBrushRequest {
  image: string;      // Base64 encoded original image
  mask: string;       // Base64 encoded mask image (white = inpaint area)
  prompt: string;     // User prompt for generation
  mode: 'flux' | 'i2i';  // Processing mode
  userId?: string;
  referenceImage?: string;  // Base64 encoded reference image for I2I mode
  styleStrength?: number;   // Style strength (0.5 ~ 1.5) for I2I mode
}

interface ImageBrushResponse {
  success: boolean;
  imageUrl?: string;
  originalImageUrl?: string;  // Added for debugging
  maskImageUrl?: string;       // Added for debugging
  referenceImageUrl?: string;  // Added for I2I mode
  error?: string;
  processingTime?: number;
}

// Helper function to convert base64 to blob with safe decoding
function base64ToBlob(base64: string): Uint8Array {
  try {
    // Remove data URL prefix if present
    let base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
    
    // Add padding if necessary (inspired by test-5.py)
    const missingPadding = base64Data.length % 4;
    if (missingPadding) {
      base64Data += '='.repeat(4 - missingPadding);
    }
    
    // Decode base64
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    return bytes;
  } catch (error) {
    console.error('Base64 decoding error:', error);
    throw new Error('Failed to decode base64 image data');
  }
}

// Helper function to download image from URL
async function downloadImage(url: string): Promise<Uint8Array> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

// Workflow JSON embedded directly (Deno Deploy doesn't support file system access)
const WORKFLOW_TEMPLATE = {
  "10": {
    "inputs": {
      "vae_name": "ae.safetensors"
    },
    "class_type": "VAELoader",
    "_meta": {
      "title": "VAE 로드"
    }
  },
  "11": {
    "inputs": {
      "clip_name1": "clip_l.safetensors",
      "clip_name2": "t5xxl_fp16.safetensors",
      "type": "flux",
      "device": "default"
    },
    "class_type": "DualCLIPLoader",
    "_meta": {
      "title": "이중 CLIP 로드"
    }
  },
  "173": {
    "inputs": {
      "style_model_name": "flux-redux.safetensors"
    },
    "class_type": "StyleModelLoader",
    "_meta": {
      "title": "스타일 모델 로드"
    }
  },
  "422": {
    "inputs": {
      "image": "input-1.png",
      "upload": "image"
    },
    "class_type": "LoadImage",
    "_meta": {
      "title": "이미지 로드"
    }
  },
  "590": {
    "inputs": {
      "image": "input-2.png",
      "upload": "image"
    },
    "class_type": "LoadImage",
    "_meta": {
      "title": "이미지 로드"
    }
  },
  "645": {
    "inputs": {
      "width": 1024,
      "height": 0,
      "interpolation": "lanczos",
      "method": "keep proportion",
      "condition": "always",
      "multiple_of": 0,
      "image": ["590", 0]
    },
    "class_type": "ImageResize+",
    "_meta": {
      "title": "🔧 Image Resize"
    }
  },
  "646": {
    "inputs": {
      "width": ["645", 1],
      "height": ["645", 2],
      "interpolation": "lanczos",
      "method": "pad",
      "condition": "always",
      "multiple_of": 0,
      "image": ["422", 0]
    },
    "class_type": "ImageResize+",
    "_meta": {
      "title": "🔧 Image Resize"
    }
  },
  "649": {
    "inputs": {
      "direction": "right",
      "match_image_size": true,
      "image1": ["646", 0],
      "image2": ["645", 0]
    },
    "class_type": "ImageConcanate",
    "_meta": {
      "title": "Image Concatenate"
    }
  },
  "651": {
    "inputs": {
      "width": ["645", 1],
      "height": ["645", 2],
      "red": 0,
      "green": 0,
      "blue": 0
    },
    "class_type": "Image Blank",
    "_meta": {
      "title": "Image Blank"
    }
  },
  "652": {
    "inputs": {
      "direction": "right",
      "match_image_size": true,
      "image1": ["651", 0],
      "image2": ["653", 0]
    },
    "class_type": "ImageConcanate",
    "_meta": {
      "title": "Image Concatenate"
    }
  },
  "653": {
    "inputs": {
      "mask": ["698", 0]
    },
    "class_type": "MaskToImage",
    "_meta": {
      "title": "마스크를 이미지로 변환"
    }
  },
  "655": {
    "inputs": {
      "channel": "red",
      "image": ["652", 0]
    },
    "class_type": "ImageToMask",
    "_meta": {
      "title": "이미지를 마스크로 변환"
    }
  },
  "658": {
    "inputs": {
      "text": "",
      "clip": ["11", 0]
    },
    "class_type": "CLIPTextEncode",
    "_meta": {
      "title": "CLIP 텍스트 인코딩 (프롬프트)"
    }
  },
  "659": {
    "inputs": {
      "conditioning": ["658", 0]
    },
    "class_type": "ConditioningZeroOut",
    "_meta": {
      "title": "조건 (0으로 출력)"
    }
  },
  "660": {
    "inputs": {
      "noise_mask": true,
      "positive": ["658", 0],
      "negative": ["659", 0],
      "vae": ["10", 0],
      "pixels": ["649", 0],
      "mask": ["679", 0]
    },
    "class_type": "InpaintModelConditioning",
    "_meta": {
      "title": "인페인팅 모델 조건 설정"
    }
  },
  "661": {
    "inputs": {
      "guidance": 30,
      "conditioning": ["667", 0]
    },
    "class_type": "FluxGuidance",
    "_meta": {
      "title": "FLUX 가이드"
    }
  },
  "662": {
    "inputs": {
      "crop": "center",
      "clip_vision": ["663", 0],
      "image": ["422", 0]
    },
    "class_type": "CLIPVisionEncode",
    "_meta": {
      "title": "CLIP_VISION 인코딩"
    }
  },
  "663": {
    "inputs": {
      "clip_name": "igclip_vision_patch14_384.safetensors"
    },
    "class_type": "CLIPVisionLoader",
    "_meta": {
      "title": "CLIP_VISION 로드"
    }
  },
  "665": {
    "inputs": {
      "samples": ["689", 0],
      "vae": ["10", 0]
    },
    "class_type": "VAEDecode",
    "_meta": {
      "title": "VAE 디코드"
    }
  },
  "667": {
    "inputs": {
      "strength": 1,
      "strength_type": "multiply",
      "conditioning": ["660", 0],
      "style_model": ["173", 0],
      "clip_vision_output": ["662", 0]
    },
    "class_type": "StyleModelApply",
    "_meta": {
      "title": "스타일 모델 적용"
    }
  },
  "669": {
    "inputs": {
      "images": ["680", 0]
    },
    "class_type": "PreviewImage",
    "_meta": {
      "title": "이미지 미리보기"
    }
  },
  "679": {
    "inputs": {
      "expand": 5,
      "incremental_expandrate": 0,
      "tapered_corners": true,
      "flip_input": false,
      "blur_radius": 3,
      "lerp_alpha": 1,
      "decay_factor": 1,
      "fill_holes": false,
      "mask": ["655", 0]
    },
    "class_type": "GrowMaskWithBlur",
    "_meta": {
      "title": "Grow Mask With Blur"
    }
  },
  "680": {
    "inputs": {
      "width": ["645", 1],
      "height": ["645", 2],
      "position": "top-right",
      "x_offset": 0,
      "y_offset": 0,
      "image": ["665", 0]
    },
    "class_type": "ImageCrop+",
    "_meta": {
      "title": "🔧 Image Crop"
    }
  },
  "687": {
    "inputs": {
      "unet_name": "flux_fill_Q8.gguf"
    },
    "class_type": "UnetLoaderGGUF",
    "_meta": {
      "title": "Unet Loader (GGUF)"
    }
  },
  "688": {
    "inputs": {
      "model": ["687", 0]
    },
    "class_type": "DifferentialDiffusion",
    "_meta": {
      "title": "차등 확산"
    }
  },
  "689": {
    "inputs": {
      "seed": "{seed}",
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
    "class_type": "KSampler",
    "_meta": {
      "title": "KSampler"
    }
  },
  "698": {
    "inputs": {
      "image": "mask.png",
      "channel": "red",
      "upload": "image"
    },
    "class_type": "LoadImageMask",
    "_meta": {
      "title": "마스크 이미지 로드"
    }
  },
  "699": {
    "inputs": {
      "filename_prefix": "const",
      "images": ["680", 0]
    },
    "class_type": "SaveImage",
    "_meta": {
      "title": "이미지 저장"
    }
  }
};

// Load and prepare workflow JSON
function loadWorkflowJson(): any {
  // Deep clone the template
  let workflowData = JSON.parse(JSON.stringify(WORKFLOW_TEMPLATE));
  
  // Replace {seed} placeholder with random value
  const seed = Math.floor(Math.random() * 999999);
  
  // Convert to string to replace placeholder
  let workflowString = JSON.stringify(workflowData);
  workflowString = workflowString.replace('"{seed}"', seed.toString());
  
  // Parse back to object
  workflowData = JSON.parse(workflowString);
  
  return workflowData;
}

// RunPod API call for I2I
async function callRunPodAPI(
  textureImage: string,    // input-1.png: texture/clothing to be applied (인페인트될 소재)
  originalImage: string,   // input-2.png: original/reference image to be inpainted (인페인트 당할 대상)
  maskImage: string,       // mask.png: mask marking the area to be inpainted
  prompt: string,          // User prompt for additional guidance
  apiKey: string,
  endpointId: string
): Promise<string> {
  const startTime = Date.now();
  
  // Load and prepare workflow
  const workflowData = loadWorkflowJson();
  
  // Update prompt in workflow if provided
  if (prompt && workflowData['658']) {
    workflowData['658']['inputs']['text'] = prompt;
  }
  
  // Prepare request data according to RunPod format
  // workflow는 JSON 객체로 직접 전달 (test-5.py 방식 따름)
  const requestData = {
    input: {
      workflow: workflowData,  // JSON 객체를 그대로 전송
      images: [
        {
          name: "input-1.png",  // 인페인트될 텍스처/옷
          image: textureImage.split(',')[1] || textureImage  // base64 encoded string
        },
        {
          name: "input-2.png",  // 인페인트 당할 원본/레퍼런스
          image: originalImage.split(',')[1] || originalImage  // base64 encoded string
        },
        {
          name: "mask.png",  // 인페인트될 부분 마스크
          image: maskImage.split(',')[1] || maskImage  // base64 encoded string
        }
      ]
    }
  };
  
  console.log('Calling RunPod API...');
  console.log('Endpoint ID:', endpointId);
  console.log('Workflow nodes:', Object.keys(workflowData).length);
  console.log('Images provided:', requestData.input.images.length);
  
  // Initial API call to start generation
  const RUNPOD_API_URL = `https://api.runpod.ai/v2/${endpointId}/run`;
  
  const response = await fetch(RUNPOD_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestData)
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('RunPod API error:', errorText);
    console.error('Status:', response.status);
    console.error('Headers:', response.headers);
    throw new Error(`RunPod API error: ${response.status} - ${errorText}`);
  }
  
  const responseData = await response.json();
  const jobId = responseData.id;
  
  if (!jobId) {
    throw new Error('No job ID received from RunPod API');
  }
  
  console.log(`RunPod job started with ID: ${jobId}`);
  
  // Poll for result
  return await pollRunPodResult(jobId, apiKey, endpointId, startTime);
}

// Poll RunPod job status
async function pollRunPodResult(
  jobId: string,
  apiKey: string,
  endpointId: string,
  startTime: number
): Promise<string> {
  const RUNPOD_STATUS_URL = `https://api.runpod.ai/v2/${endpointId}/status/${jobId}`;
  const maxAttempts = 120; // 10 minutes (5 seconds * 120) - RunPod extreme cold start 고려
  let attempts = 0;
  let coldStartLogged = false;
  let warningLogged = false;
  
  while (attempts < maxAttempts) {
    attempts++;
    
    // Wait before checking (reduced API calls like test-5.py)
    await new Promise(resolve => setTimeout(resolve, 5000)); // 5 seconds
    
    // Check status
    const statusResponse = await fetch(RUNPOD_STATUS_URL, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    if (!statusResponse.ok) {
      console.error(`Status check failed: ${statusResponse.status}`);
      continue; // Keep trying
    }
    
    const statusData = await statusResponse.json();
    const status = statusData.status;
    
    console.log(`RunPod status (attempt ${attempts}): ${status}`);
    
    if (status === 'COMPLETED') {
      // Extract result image
      const output = statusData.output;
      console.log('RunPod output structure:', Object.keys(output || {}));
      
      // Try different output formats (based on test-5.py logic)
      
      // 1. Check for images array format (most common)
      if (output?.images && Array.isArray(output.images)) {
        console.log(`Found ${output.images.length} images in output`);
        
        for (const imageItem of output.images) {
          // Handle dict format with 'data' key
          if (typeof imageItem === 'object' && imageItem.data) {
            console.log(`RunPod generation completed in ${Date.now() - startTime}ms`);
            return imageItem.data; // Base64 image data
          }
          // Handle direct base64 string in array
          else if (typeof imageItem === 'string' && imageItem.length > 100) {
            console.log('Found direct base64 in images array');
            return imageItem;
          }
        }
      }
      
      // 2. Single image format
      if (output?.image) {
        console.log('Found single image format');
        return output.image;
      }
      
      // 3. Direct string output
      if (typeof output === 'string' && output.length > 100) {
        console.log('Found direct string output');
        return output;
      }
      
      // 4. Search for base64 in other keys (fallback)
      if (output && typeof output === 'object') {
        console.log('Searching for base64 data in output keys...');
        for (const [key, value] of Object.entries(output)) {
          // Check if value looks like base64 image data
          if (typeof value === 'string' && value.length > 1000) {
            console.log(`Found potential image data in key '${key}'`);
            return value;
          }
        }
      }
      
      console.error('Unexpected output structure:', JSON.stringify(output).substring(0, 500));
      throw new Error('No valid image found in RunPod result');
      
    } else if (status === 'FAILED') {
      const errorMsg = statusData.error || 'Unknown error';
      throw new Error(`RunPod job failed: ${errorMsg}`);
      
    } else if (status === 'IN_QUEUE' || status === 'IN_PROGRESS') {
      // Cold start 감지 및 로깅 (5초 간격이므로 6번 = 30초)
      if (!coldStartLogged && attempts > 6 && status === 'IN_QUEUE') {
        console.log('RunPod cold start detected - model is loading (this may take 30-60 seconds)');
        coldStartLogged = true;
      }
      
      // 장시간 대기 경고
      if (!warningLogged && attempts > 24 && status === 'IN_QUEUE') {
        console.warn(`RunPod job stuck in queue for ${attempts * 5} seconds. Possible issues:`);
        console.warn('1. No available workers in the endpoint');
        console.warn('2. Endpoint configuration issue');
        console.warn('3. RunPod service disruption');
        warningLogged = true;
      }
      
      // 극단적인 대기 시간에 대한 처리
      if (attempts > 48 && status === 'IN_QUEUE') {
        // 4분 이상 IN_QUEUE 상태면 문제가 있을 가능성 높음
        console.error(`RunPod job stuck in IN_QUEUE for ${attempts * 5} seconds`);
        
        // Job 취소 시도 (선택사항)
        // const cancelUrl = `https://api.runpod.ai/v2/${endpointId}/cancel/${jobId}`;
        // await fetch(cancelUrl, { method: 'POST', headers: { 'Authorization': `Bearer ${apiKey}` }});
        
        throw new Error(`RunPod job stuck in queue for too long (${attempts * 5} seconds). The endpoint may not have available workers or there may be a configuration issue.`);
      }
      
      // Continue polling
      continue;
      
    } else {
      console.log(`Unknown RunPod status: ${status}`);
    }
  }
  
  throw new Error(`RunPod job timeout after ${attempts} attempts (${(Date.now() - startTime) / 1000} seconds). The model may be experiencing high load.`);
}

// BFL FLUX Fill API call
async function callFluxFillAPI(
  image: string,
  mask: string, 
  prompt: string,
  bflToken: string
): Promise<string> {
  const startTime = Date.now();
  
  // Prepare request data
  const requestData = {
    prompt: prompt,
    seed: Math.floor(Math.random() * 999999),
    image: image.split(',')[1] || image, // Remove data URL prefix if present
    mask: mask.split(',')[1] || mask,
    guidance: 30,  // Reduced from 80 for more natural results
    output_format: 'png',
    safety_tolerance: 2,
    prompt_upsampling: false,
  };

  console.log('Calling BFL FLUX Fill API...');
  
  // Initial API call to start generation
  const response = await fetch(BFL_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Key': bflToken,
    },
    body: JSON.stringify(requestData),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('BFL API error:', errorText);
    throw new Error(`BFL API error: ${response.status} - ${errorText}`);
  }

  const responseData = await response.json();
  const genId = responseData.id;
  
  if (!genId) {
    throw new Error('No generation ID received from BFL API');
  }
  
  console.log(`Generation started with ID: ${genId}`);

  // Poll for result
  const maxAttempts = 60; // 60 attempts * 2 seconds = 2 minutes max
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    attempts++;
    
    // Wait before checking
    await new Promise(resolve => setTimeout(resolve, 2000)); // 2 seconds
    
    // Check result
    const resultResponse = await fetch(`${BFL_RESULT_URL}?id=${genId}`, {
      method: 'GET',
      headers: {
        'X-Key': bflToken,
      },
    });

    if (!resultResponse.ok) {
      console.error(`Result check failed: ${resultResponse.status}`);
      continue; // Keep trying
    }

    const result = await resultResponse.json();
    const status = result.status;
    
    console.log(`Status (attempt ${attempts}): ${status}`);

    if (status === 'Ready') {
      const imageUrl = result.result?.sample || result.result?.url;
      if (!imageUrl) {
        throw new Error('No image URL in result');
      }
      
      console.log(`Generation completed in ${Date.now() - startTime}ms`);
      return imageUrl;
      
    } else if (status === 'Pending') {
      // Continue polling
      continue;
      
    } else if (status === 'Task not found' || status === 'Request Moderated' || 
               status === 'Content Moderated' || status === 'Error') {
      const errorMsg = result.error || status;
      throw new Error(`Generation failed: ${errorMsg}`);
    }
  }
  
  throw new Error('Generation timeout - took too long to complete');
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  console.log('Image brush request received');
  const startTime = Date.now();

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const bflToken = Deno.env.get('BFL_TOKEN');
    
    if (!bflToken) {
      throw new Error('BFL_TOKEN not configured');
    }

    // Get auth token from request header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Authentication required.' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    // Create Supabase client for auth
    const supabaseAnon = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabaseAuth = createClient(supabaseUrl, supabaseAnon, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });
    
    // Verify user
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Login required.' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Parse request body
    const body: ImageBrushRequest = await req.json();
    const { image, mask, prompt, mode, referenceImage, styleStrength } = body;

    // Validate required fields
    if (!image || !mask) {
      return new Response(
        JSON.stringify({ error: 'Image and mask are required.' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Mode-specific validation
    if (mode === 'flux' && !prompt) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required for FLUX mode.' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    if (mode === 'i2i' && !referenceImage) {
      return new Response(
        JSON.stringify({ error: 'Reference image is required for I2I mode.' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`Processing ${mode} request for user ${user.id}`);

    // Create Supabase service client for storage operations
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);
    const timestamp = Date.now();

    // Save original image to storage
    console.log('Saving original image to storage...');
    const originalImageData = base64ToBlob(image);
    const originalFileName = `image-brush/${user.id}/${timestamp}_original.png`;
    
    const { error: originalUploadError } = await supabaseService.storage
      .from('user-uploads')
      .upload(originalFileName, originalImageData, {
        contentType: 'image/png',
        upsert: false
      });

    if (originalUploadError) {
      console.error('Original image upload error:', originalUploadError);
      throw new Error('Failed to save original image.');
    }

    // Get public URL for original image
    const { data: { publicUrl: originalImageUrl } } = supabaseService.storage
      .from('user-uploads')
      .getPublicUrl(originalFileName);

    // Save mask image to storage  
    console.log('Saving mask image to storage...');
    const maskImageData = base64ToBlob(mask);
    const maskFileName = `image-brush/${user.id}/${timestamp}_mask.png`;
    
    const { error: maskUploadError } = await supabaseService.storage
      .from('user-uploads')
      .upload(maskFileName, maskImageData, {
        contentType: 'image/png',
        upsert: false
      });

    if (maskUploadError) {
      console.error('Mask image upload error:', maskUploadError);
      throw new Error('Failed to save mask image.');
    }

    // Get public URL for mask image
    const { data: { publicUrl: maskImageUrl } } = supabaseService.storage
      .from('user-uploads')
      .getPublicUrl(maskFileName);

    console.log('Original image URL:', originalImageUrl);
    console.log('Mask image URL:', maskImageUrl);

    let resultImageUrl: string;
    let referenceImageUrl: string | undefined;

    if (mode === 'flux') {
      // Call BFL FLUX Fill API
      resultImageUrl = await callFluxFillAPI(image, mask, prompt || '', bflToken);
      
    } else if (mode === 'i2i') {
      // RunPod I2I mode
      const runpodApiKey = Deno.env.get('RUNPOD_API_KEY');
      const runpodEndpointId = Deno.env.get('RUNPOD_ENDPOINT_ID');
      
      if (!runpodApiKey || !runpodEndpointId) {
        console.error('RunPod configuration missing');
        return new Response(
          JSON.stringify({ error: 'I2I mode is not configured. Please contact support.' }),
          { 
            status: 503,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      // Save reference image to storage
      if (referenceImage) {
        console.log('Saving reference image to storage...');
        const refImageData = base64ToBlob(referenceImage);
        const refFileName = `image-brush/${user.id}/${timestamp}_reference.png`;
        
        const { error: refUploadError } = await supabaseService.storage
          .from('user-uploads')
          .upload(refFileName, refImageData, {
            contentType: 'image/png',
            upsert: false
          });
        
        if (refUploadError) {
          console.error('Reference image upload error:', refUploadError);
          throw new Error('Failed to save reference image.');
        }
        
        // Get public URL for reference image
        const { data: { publicUrl: refUrl } } = supabaseService.storage
          .from('user-uploads')
          .getPublicUrl(refFileName);
        
        referenceImageUrl = refUrl;
        console.log('Reference image URL:', referenceImageUrl);
      }
      
      // Call RunPod API
      console.log('Calling RunPod API for I2I processing...');
      const resultBase64 = await callRunPodAPI(
        referenceImage!,    // Texture/clothing to be applied (input-1.png)
        image,              // Reference image to be inpainted (input-2.png)
        mask,              // Mask for inpainting area
        prompt || '',      // Optional prompt for additional guidance
        runpodApiKey,
        runpodEndpointId
      );
      
      // Result will be Base64, need to download if it's a URL
      if (resultBase64.startsWith('http')) {
        // If RunPod returns a URL instead of Base64
        resultImageUrl = resultBase64;
      } else {
        // Base64 result - will be saved to storage below
        resultImageUrl = resultBase64;
      }
      
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid processing mode.' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Download or convert the generated image
    console.log('Processing generated image...');
    let imageData: Uint8Array;
    
    if (resultImageUrl.startsWith('http')) {
      // Download from URL
      imageData = await downloadImage(resultImageUrl);
    } else {
      // Convert Base64 to blob
      imageData = base64ToBlob(resultImageUrl);
    }
    
    // Save result image to Supabase Storage
    const resultFileName = `image-brush/${user.id}/${timestamp}_result.png`;
    
    const { error: uploadError } = await supabaseService.storage
      .from('user-uploads')
      .upload(resultFileName, imageData, {
        contentType: 'image/png',
        upsert: false
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      throw new Error('Failed to save result image.');
    }

    // Get public URL for result image
    const { data: { publicUrl } } = supabaseService.storage
      .from('user-uploads')
      .getPublicUrl(resultFileName);

    // Save metadata to database with all URLs
    const { error: dbError } = await supabaseService
      .from('image_brush_history')
      .insert({
        user_id: user.id,
        original_image_url: originalImageUrl,  // URL instead of base64
        mask_image_url: maskImageUrl,          // URL instead of base64
        reference_image_url: referenceImageUrl, // Reference image URL for I2I
        prompt: prompt || '',
        result_url: publicUrl,
        mode: mode,
        style_strength: styleStrength || 1.0,
        processing_time: Date.now() - startTime,
        created_at: new Date().toISOString()
      });

    if (dbError) {
      console.warn('Failed to save history:', dbError);
      // Continue even if history save fails
    }

    const processingTime = Date.now() - startTime;
    console.log(`Image brush completed in ${processingTime}ms`);

    // Return success response with all URLs
    const response: ImageBrushResponse = {
      success: true,
      imageUrl: publicUrl,
      originalImageUrl: originalImageUrl,  // Include for debugging
      maskImageUrl: maskImageUrl,          // Include for debugging
      referenceImageUrl: referenceImageUrl, // Include for I2I mode
      processingTime
    };

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Image brush error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    // 더 자세한 에러 메시지
    let errorMessage = 'An error occurred during processing.';
    let statusCode = 500;
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // 특정 에러 타입에 따른 상태 코드
      if (error.message.includes('timeout')) {
        statusCode = 504;
      } else if (error.message.includes('not configured')) {
        statusCode = 503;
      } else if (error.message.includes('required')) {
        statusCode = 400;
      }
    }
    
    const response: ImageBrushResponse = {
      success: false,
      error: errorMessage
    };

    // 항상 유효한 JSON 응답 반환
    return new Response(
      JSON.stringify(response),
      { 
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});