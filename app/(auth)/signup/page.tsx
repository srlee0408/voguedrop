import { SignupForm } from './_components/SignupForm'
import Link from 'next/link'

export default function SignupPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <Link href="/" className="absolute top-8 left-8 font-sans text-xl font-bold text-primary tracking-tight hover:opacity-80 transition-opacity">
        vogue drop
      </Link>
      
      <div className="relative mx-auto w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            Create your account
          </h1>
          <p className="mt-2 text-base text-text-secondary">
            Join VogueDrop to start creating amazing fashion videos
          </p>
        </div>
        
        <div className="relative rounded-2xl bg-surface/50 backdrop-blur-sm border border-border px-8 py-10 shadow-xl">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 opacity-50" />
          <div className="relative">
            <SignupForm />
            
            <div className="mt-6 text-center text-sm">
              <span className="text-text-secondary">Already have an account? </span>
              <Link 
                href="/login" 
                className="font-medium text-primary hover:text-primary/80 transition-colors"
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}