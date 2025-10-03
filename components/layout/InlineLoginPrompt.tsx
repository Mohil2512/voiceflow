"use client"

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Layout } from './Layout'
import { Heart, User, LogIn } from 'lucide-react'

interface InlineLoginPromptProps {
  type: 'notification' | 'profile'
}

export function InlineLoginPrompt({ type }: InlineLoginPromptProps) {
  const config = {
    notification: {
      icon: Heart,
      title: 'Notifications',
      message: 'You are not logged in. Please log in to access notifications.',
      description: 'Stay updated with likes, comments, and mentions from other users.'
    },
    profile: {
      icon: User,
      title: 'Profile',
      message: 'You are not logged in. Please log in to access your profile.',
      description: 'Manage your profile, view your posts, and customize your account.'
    }
  }

  const { icon: Icon, title, message, description } = config[type]

  return (
    <Layout>
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md border border-border">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <Icon className="w-6 h-6 text-muted-foreground" />
            </div>
            <CardTitle className="text-xl text-foreground">{title}</CardTitle>
            <CardDescription className="text-muted-foreground">
              {description}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                {message}
              </p>
            </div>
            
            <div className="space-y-3">
            <Link href="/auth/signin" className="w-full">
              <Button className="w-full" size="lg">
                <LogIn className="w-4 h-4 mr-2" />
                Sign In
              </Button>
            </Link>
            
            <Link href="/auth/signup" className="w-full">
              <Button variant="outline" className="w-full" size="lg">
                Create Account
              </Button>
            </Link>
          </div>
          
          <div className="text-center pt-4">
            <Link 
              href="/" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Back to Home
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
    </Layout>
  )
}