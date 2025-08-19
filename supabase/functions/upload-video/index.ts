// Supabase Edge Function for video upload
// This function handles large video file uploads (up to 50MB)
// It bypasses Vercel's 4.5MB limit by running on Supabase's edge runtime

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';
import { corsHeaders } from '../_shared/cors.ts';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];

// Sanitize filename for storage
function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[^a-zA-Z0-9가-힣.\-_]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_{2,}/g, '_')
    .slice(0, 100);
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  console.log('Upload request received');
  const startTime = Date.now();

  try {
    // Get Supabase URL and keys from environment
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    // Get auth token from request header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: '인증이 필요합니다.' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    // Create Supabase client with anon key and set the user's token
    const supabaseAnon = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabaseAuth = createClient(supabaseUrl, supabaseAnon, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: '로그인이 필요합니다.' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Parse multipart form data with timeout check
    console.log('Parsing form data...');
    const formData = await req.formData();
    console.log(`Form data parsed in ${Date.now() - startTime}ms`);
    const file = formData.get('file') as File;
    const thumbnail = formData.get('thumbnail') as File | null;
    
    // Extract metadata from form data
    const duration = formData.get('duration') as string | null;
    const aspectRatio = formData.get('aspectRatio') as string | null;
    const width = formData.get('width') as string | null;
    const height = formData.get('height') as string | null;

    if (!file) {
      return new Response(
        JSON.stringify({ error: '파일이 없습니다.' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({ 
          error: `파일 크기는 50MB를 초과할 수 없습니다. (현재: ${(file.size / 1024 / 1024).toFixed(2)}MB)` 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return new Response(
        JSON.stringify({ 
          error: '지원하지 않는 파일 형식입니다. MP4, WebM, MOV 파일만 업로드 가능합니다.' 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Generate filename and storage path
    const originalName = file.name;
    const sanitizedName = sanitizeFileName(originalName);
    const timestamp = Date.now();
    const fileName = `${timestamp}_${sanitizedName}`;
    const storagePath = `video/${user.id}/${fileName}`;

    // Create service client for storage operations
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

    // Upload video file to storage
    console.log(`Starting file upload (${(file.size / 1024 / 1024).toFixed(2)}MB)...`);
    const fileBuffer = await file.arrayBuffer();
    console.log(`File buffered in ${Date.now() - startTime}ms`);
    
    const { error: uploadError } = await supabaseService.storage
      .from('user-uploads')
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        upsert: false
      });
    console.log(`File uploaded in ${Date.now() - startTime}ms`);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return new Response(
        JSON.stringify({ error: '파일 업로드에 실패했습니다.' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get public URL for the uploaded video
    const { data: { publicUrl } } = supabaseService.storage
      .from('user-uploads')
      .getPublicUrl(storagePath);

    // Handle thumbnail upload if provided
    let thumbnailUrl: string | null = null;
    if (thumbnail) {
      try {
        const thumbnailPath = `video/${user.id}/thumbnails/${timestamp}_thumbnail.jpg`;
        const thumbnailBuffer = await thumbnail.arrayBuffer();
        
        const { error: thumbnailError } = await supabaseService.storage
          .from('user-uploads')
          .upload(thumbnailPath, thumbnailBuffer, {
            contentType: 'image/jpeg',
            upsert: false
          });
        
        if (!thumbnailError) {
          const { data: { publicUrl: thumbUrl } } = supabaseService.storage
            .from('user-uploads')
            .getPublicUrl(thumbnailPath);
          thumbnailUrl = thumbUrl;
        } else {
          console.warn('Thumbnail upload failed:', thumbnailError);
        }
      } catch (err) {
        console.warn('Thumbnail processing error:', err);
        // Continue even if thumbnail fails
      }
    }

    // Save metadata to database
    const { data: savedVideo, error: dbError } = await supabaseService
      .from('user_uploaded_videos')
      .insert({
        user_id: user.id,
        file_name: originalName,
        storage_path: storagePath,
        file_size: file.size,
        duration: duration ? parseFloat(duration) : null,
        aspect_ratio: aspectRatio || null,
        thumbnail_url: thumbnailUrl,
        metadata: {
          mime_type: file.type,
          original_name: originalName,
          width: width ? parseInt(width) : null,
          height: height ? parseInt(height) : null
        },
        uploaded_at: new Date().toISOString()
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      // Rollback: delete uploaded file from storage
      await supabaseService.storage
        .from('user-uploads')
        .remove([storagePath]);
      
      return new Response(
        JSON.stringify({ error: '데이터베이스 저장에 실패했습니다.' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Return success response with video data
    return new Response(
      JSON.stringify({
        success: true,
        video: {
          ...savedVideo,
          url: publicUrl
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ error: '업로드 중 오류가 발생했습니다.' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});