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
  collapsed?: boolean
}

export function AppSidebarLink({ title, url, icon: Icon, isActive, requiresAuth = false, isMobile = false, collapsed = false }: AppSidebarLinkProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [isNavigating, setIsNavigating] = useState(false)
  const requiresAuthentication = requiresAuth && !session?.user

  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (requiresAuthentication) {
      event.preventDefault()
      router.push('/auth/signin')
      return
    }

    setIsNavigating(true)

    if (!isActive && url !== '#') {
      router.prefetch(url)
    }
  }

  return (
    <Link
      href={url}
      onClick={handleClick}
  prefetch={!requiresAuthentication && url !== '#'}
      className={cn(
        "flex items-center rounded-xl text-left transition-all duration-150",
        isMobile 
          ? "flex-col gap-1 px-2 py-3 min-w-0" // Mobile: stacked layout, tighter spacing
          : collapsed
            ? "justify-center gap-0 px-2 py-3 w-full"
            : "gap-4 px-4 py-3 w-full", // Desktop: horizontal layout
        isActive
          ? "bg-accent text-accent-foreground font-medium"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        isNavigating && !isActive && "opacity-70 scale-95"
      )}
      title={collapsed ? title : undefined}
    >
      <Icon className={cn(
        "transition-all duration-150", 
        isMobile ? "h-5 w-5" : "h-7 w-7", // Smaller icons on mobile
        isActive ? "stroke-2" : "stroke-1",
        isNavigating && "animate-pulse"
      )} />
      <span className={cn(
        "font-normal",
        isMobile ? "text-xs leading-tight text-center" : collapsed ? "sr-only" : "text-xl" // Smaller text on mobile
      )}>{title}</span>
    </Link>
  )
}