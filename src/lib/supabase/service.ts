import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Create a Supabase client with Service Role privileges
 * 
 * WARNING: This client bypasses RLS and should only be used in secure server-side contexts
 * Never expose the Service Role key to the client
 */
export function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error('Missing Supabase Service Role configuration');
  }

  return createSupabaseClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  });
}

/**
 * Helper to ensure we're in a server environment
 */
export function ensureServerEnvironment() {
  if (typeof window !== 'undefined') {
    throw new Error('Service Role client can only be used on the server');
  }
}