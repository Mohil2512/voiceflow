"use client"

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import { Mail, Github, User, LogIn } from 'lucide-react'

export function LoginPrompt() {
  const [isLoading, setIsLoading] = useState(false)

  const handleOAuthSignIn = async (provider: 'google' | 'github') => {
    setIsLoading(true)
    try {
      // Store current URL for redirect after login
      const currentUrl = window.location.pathname
      if (currentUrl !== '/') {
        localStorage.setItem('redirectAfterLogin', currentUrl)
      }
      
      await signIn(provider, { callbackUrl: '/' })
    } catch (error) {
      console.error(`Failed to sign in with ${provider}:`, error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleManualSignInRedirect = () => {
    // Store current URL for redirect after login
    const currentUrl = window.location.pathname
    if (currentUrl !== '/') {
      localStorage.setItem('redirectAfterLogin', currentUrl)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black"></div>
      
      {/* Login Card - Centered Modal Style */}
      <div className="relative z-10 w-full max-w-md mx-4">
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-8 space-y-6">
            {/* Logo */}
            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-white rounded-full flex items-center justify-center mb-4">
                <span className="text-black text-2xl font-bold">@</span>
              </div>
              <h1 className="text-2xl font-bold">Log in or sign up for Voiceflow</h1>
              <p className="text-gray-400 mt-2">
                See what people are talking about and join the conversation.
              </p>
            </div>

            {/* OAuth Buttons */}
            <div className="space-y-3">
              <Button
                onClick={() => handleOAuthSignIn('google')}
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3"
                size="lg"
              >
                <Mail className="h-5 w-5 mr-2" />
                Continue with Google
              </Button>

              <Button
                onClick={() => handleOAuthSignIn('github')}
                disabled={isLoading}
                className="w-full bg-gray-700 hover:bg-gray-600 text-white py-3"
                size="lg"
              >
                <Github className="h-5 w-5 mr-2" />
                Continue with GitHub
              </Button>
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-gray-900 px-4 text-gray-400">or</span>
              </div>
            </div>

            {/* Manual Login Options */}
            <div className="space-y-3">
              <Link href="/auth/signin" className="w-full" onClick={handleManualSignInRedirect}>
                <Button
                  variant="outline"
                  className="w-full border-gray-600 text-white hover:bg-gray-800 py-3"
                  size="lg"
                  disabled={isLoading}
                >
                  <LogIn className="h-5 w-5 mr-2" />
                  Sign in with email
                </Button>
              </Link>

              <Link href="/auth/signup" className="w-full" onClick={handleManualSignInRedirect}>
                <Button
                  variant="outline"
                  className="w-full border-gray-600 text-white hover:bg-gray-800 py-3"
                  size="lg"
                  disabled={isLoading}
                >
                  <User className="h-5 w-5 mr-2" />
                  Create new account
                </Button>
              </Link>
            </div>

            {/* Footer */}
            <div className="text-center text-xs text-gray-500">
              <p>
                By continuing, you agree to our{' '}
                <Link href="/terms" className="text-blue-400 hover:underline">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="text-blue-400 hover:underline">
                  Privacy Policy
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Background Text */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center opacity-5">
          <h2 className="text-9xl font-bold">Voiceflow</h2>
          <p className="text-2xl mt-4">Where conversations happen</p>
        </div>
      </div>
    </div>
  )
}