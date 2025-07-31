export interface AuthError {
  message: string
  code?: string
}

export interface LoginFormData {
  email: string
  password: string
}

export interface SignupFormData {
  email: string
  password: string
  confirmPassword: string
}

export interface AuthResponse {
  success: boolean
  error?: AuthError
}