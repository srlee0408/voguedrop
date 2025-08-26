import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerSupabase } from '@/lib/supabase/server'
import { createServiceClient, ensureServerEnvironment } from '@/lib/supabase/service'

interface UpdateProfileBody {
  overlap_replace_preference?: 'ask' | 'always_replace' | 'never_replace'
}

/**
 * GET /api/user/profile
 * - Returns the current user's profile/preferences
 */
export async function GET(): Promise<NextResponse> {
  try {
    ensureServerEnvironment()
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const service = createServiceClient()
    const { data, error } = await service
      .from('user_profile')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Default if not created yet
    const profile = data ?? {
      user_id: user.id,
      overlap_replace_preference: 'ask' as const,
    }

    return NextResponse.json(profile)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

/**
 * PUT /api/user/profile
 * - Upserts the user's profile/preferences
 */
export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    ensureServerEnvironment()
    const body = (await request.json()) as unknown

    const { overlap_replace_preference } = (body ?? {}) as UpdateProfileBody

    if (
      overlap_replace_preference &&
      !['ask', 'always_replace', 'never_replace'].includes(overlap_replace_preference)
    ) {
      return NextResponse.json({ error: 'Invalid overlap_replace_preference' }, { status: 400 })
    }

    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const service = createServiceClient()

    // Ensure row exists, then update
    const { data: existing, error: fetchErr } = await service
      .from('user_profile')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (fetchErr) {
      return NextResponse.json({ error: fetchErr.message }, { status: 500 })
    }

    const payload: Record<string, unknown> = { user_id: user.id }
    if (overlap_replace_preference) payload.overlap_replace_preference = overlap_replace_preference

    let upsertError: unknown = null
    if (!existing) {
      const { error } = await service.from('user_profile').insert(payload)
      upsertError = error
    } else {
      const { error } = await service.from('user_profile').update(payload).eq('user_id', user.id)
      upsertError = error
    }

    if (upsertError) {
      const e = upsertError as { message?: string }
      return NextResponse.json({ error: e?.message ?? 'Failed to update profile' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}


