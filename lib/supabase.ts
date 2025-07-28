import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export function getPublicUrl(path: string): string {
  if (!path) return ''
  
  // If it's already a full URL, return as is
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }
  
  // If path doesn't start with a bucket name, assume it's a relative path
  // Storage path format: bucket_name/path/to/file.ext
  const cleanPath = path.startsWith('/') ? path.slice(1) : path
  
  // Add media-asset bucket prefix if not already present
  const fullPath = cleanPath.startsWith('media-asset/') ? cleanPath : `media-asset/${cleanPath}`
  
  // Construct the full URL
  return `${supabaseUrl}/storage/v1/object/public/${fullPath}`
}