import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    template: '%s | VogueDrop',
    default: 'Authentication',
  },
  description: 'Sign in or create an account to start creating amazing fashion videos',
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background effects similar to home page */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-secondary/20 animate-gradient" />
        <div className="absolute top-0 left-0 w-96 h-96 bg-primary/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-secondary/30 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>
      {children}
    </div>
  )
}