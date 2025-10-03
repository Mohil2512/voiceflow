"use client"

import { useSession } from 'next-auth/react'
import { AppSidebar } from "./AppSidebar"
import { LoginPrompt } from "./LoginPrompt"
import { useEffect, useState } from 'react'

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  const { data: session, status } = useSession()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Show loading state
  if (status === 'loading' || !mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto"></div>
          <p className="mt-2 text-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Always show layout with sidebar - authentication not required for viewing
  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
      {/* Desktop Sidebar - Hidden on mobile */}
      <div className="hidden md:flex flex-shrink-0">
        <AppSidebar />
      </div>
      
      {/* Mobile Bottom Navigation - Visible only on mobile */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50">
        <AppSidebar />
      </div>
      
      {/* Scrollable Main Content */}
      <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
        <div className="max-w-full">
          {children}
        </div>
      </main>
    </div>
  )
}