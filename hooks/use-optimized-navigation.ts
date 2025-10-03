"use client"

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

const COMMON_ROUTES = ['/', '/profile', '/search', '/notification']

export function useOptimizedNavigation() {
  const router = useRouter()

  useEffect(() => {
    // Prefetch common routes on mount
    COMMON_ROUTES.forEach(route => {
      router.prefetch(route)
    })
  }, [router])

  const navigateWithOptimization = (href: string) => {
    // Immediate prefetch if not already done
    router.prefetch(href)
    
    // Use push for navigation
    router.push(href)
  }

  return {
    navigateWithOptimization,
    prefetchRoute: router.prefetch
  }
}