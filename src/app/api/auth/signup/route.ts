import { createClient } from '@/shared/lib/supabase/server'
import { NextResponse } from 'next/server'

interface SignupRequest {
  email: string
  password: string
}

export async function POST(request: Request) {
  try {
    const body: SignupRequest = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: { message: 'Email and password are required' } },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: { message: 'Password must be at least 8 characters long' } },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      return NextResponse.json(
        { error: { message: error.message, code: error.code } },
        { status: 400 }
      )
    }

    if (!data.user) {
      return NextResponse.json(
        { error: { message: 'Failed to create user' } },
        { status: 500 }
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
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: { message: 'An unexpected error occurred' } },
      { status: 500 }
    )
  }
}