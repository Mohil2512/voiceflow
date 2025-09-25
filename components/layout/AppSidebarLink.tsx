"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import Link from "next/link"

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

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (requiresAuth && !session) {
      e.preventDefault()
      router.push(`/auth/signin?callbackUrl=${encodeURIComponent(url)}`)
      return
    }
    // Otherwise, let the Link component handle navigation normally
  }

  return (
    <Link
      href={url}
      onClick={handleClick}
      className={cn(
        "flex items-center gap-4 rounded-xl px-4 py-3 text-left transition-colors w-full",
        isActive
          ? "bg-accent text-accent-foreground font-medium"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      )}
    >
      <Icon className={cn("h-7 w-7", isActive ? "stroke-2" : "stroke-1")} />
      <span className="text-xl font-normal">{title}</span>
    </Link>
  )
}