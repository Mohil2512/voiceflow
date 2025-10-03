"use client"

import { ReactNode, useEffect, useState } from 'react'

interface OptimizedPageWrapperProps {
  children: ReactNode
  loadingComponent?: ReactNode
}

export function OptimizedPageWrapper({ children, loadingComponent }: OptimizedPageWrapperProps) {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return loadingComponent || (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
      </div>
    )
  }

  return <>{children}</>
}