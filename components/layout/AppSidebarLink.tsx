"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { useState } from "react"

interface AppSidebarLinkProps {
  title: string
  url: string
  icon: React.FC<{ className?: string }>
  isActive: boolean
  requiresAuth?: boolean
  isMobile?: boolean
}

export function AppSidebarLink({ title, url, icon: Icon, isActive, requiresAuth = false, isMobile = false }: AppSidebarLinkProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [isNavigating, setIsNavigating] = useState(false)

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (requiresAuth && !session) {
      e.preventDefault()
      setIsNavigating(true)
      router.push(`/auth/signin?callbackUrl=${encodeURIComponent(url)}`)
      return
    }
    
    // Add immediate visual feedback
    setIsNavigating(true)
    
    // Prefetch the route if not already active
    if (!isActive && url !== '#') {
      router.prefetch(url)
    }
  }

  return (
    <Link
      href={url}
      onClick={handleClick}
      prefetch={url !== '#'}
      className={cn(
        "flex items-center rounded-xl text-left transition-all duration-150",
        isMobile 
          ? "flex-col gap-1 px-2 py-3 min-w-0" // Mobile: stacked layout, tighter spacing
          : "gap-4 px-4 py-3 w-full", // Desktop: horizontal layout
        isActive
          ? "bg-accent text-accent-foreground font-medium"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        isNavigating && !isActive && "opacity-70 scale-95"
      )}
    >
      <Icon className={cn(
        "transition-all duration-150", 
        isMobile ? "h-5 w-5" : "h-7 w-7", // Smaller icons on mobile
        isActive ? "stroke-2" : "stroke-1",
        isNavigating && "animate-pulse"
      )} />
      <span className={cn(
        "font-normal",
        isMobile ? "text-xs leading-tight text-center" : "text-xl" // Smaller text on mobile
      )}>{title}</span>
    </Link>
  )
}