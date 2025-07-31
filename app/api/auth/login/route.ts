import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { LoginFormData } from '@/types/auth'

export async function POST(request: Request) {
  try {
    const body: LoginFormData = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: { message: 'Email and password are required' } },
        { status: 400 }
      )
    }

    const supabase = createClient()

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return NextResponse.json(
        { error: { message: error.message, code: error.code } },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: { message: 'An unexpected error occurred' } },
      { status: 500 }
    )
  }
}