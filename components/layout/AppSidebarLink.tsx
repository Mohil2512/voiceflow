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
}

export function AppSidebarLink({ title, url, icon: Icon, isActive, requiresAuth = false }: AppSidebarLinkProps) {
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
        "flex items-center gap-4 rounded-xl px-4 py-3 text-left transition-all duration-150 w-full",
        isActive
          ? "bg-accent text-accent-foreground font-medium"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        isNavigating && !isActive && "opacity-70 scale-95"
      )}
    >
      <Icon className={cn(
        "h-7 w-7 transition-all duration-150", 
        isActive ? "stroke-2" : "stroke-1",
        isNavigating && "animate-pulse"
      )} />
      <span className="text-xl font-normal">{title}</span>
    </Link>
  )
}