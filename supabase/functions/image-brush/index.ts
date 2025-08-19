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
}

interface ImageBrushResponse {
  success: boolean;
  imageUrl?: string;
  originalImageUrl?: string;  // Added for debugging
  maskImageUrl?: string;       // Added for debugging
  error?: string;
  processingTime?: number;
}

// Helper function to convert base64 to blob
function base64ToBlob(base64: string): Uint8Array {
  // Remove data URL prefix if present
  const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
  
  // Decode base64
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  return bytes;
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
    const { image, mask, prompt, mode } = body;

    // Validate required fields
    if (!image || !mask || !prompt) {
      return new Response(
        JSON.stringify({ error: 'Required fields are missing.' }),
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

    if (mode === 'flux') {
      // Call BFL FLUX Fill API
      resultImageUrl = await callFluxFillAPI(image, mask, prompt, bflToken);
      
    } else if (mode === 'i2i') {
      // RunPod I2I mode (optional - not implemented in this version)
      return new Response(
        JSON.stringify({ error: 'I2I mode is not supported yet.' }),
        { 
          status: 501,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid processing mode.' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Download the generated image
    console.log('Downloading generated image...');
    const imageData = await downloadImage(resultImageUrl);
    
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
        prompt: prompt,
        result_url: publicUrl,
        mode: mode,
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
    
    const errorMessage = error instanceof Error ? error.message : 'An error occurred during processing.';
    
    const response: ImageBrushResponse = {
      success: false,
      error: errorMessage
    };

    return new Response(
      JSON.stringify(response),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});