"use client"

import { useRouter } from "next/navigation"
import { Heart } from "lucide-react"
import { cn } from "@/lib/utils"
import { useEffect, useState } from "react"

interface NotificationLinkProps {
  isActive?: boolean
  collapsed?: boolean
  variant?: 'sidebar' | 'compact'
}

export function NotificationLink({
  isActive = false,
  collapsed = false,
  variant = 'sidebar'
}: NotificationLinkProps) {
  const router = useRouter()
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    // Fetch unread notification count
    const fetchUnreadCount = async () => {
      try {
        const response = await fetch('/api/notifications')
        if (response.ok) {
          const data = await response.json()
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const unread = data.notifications?.filter((n: any) => !n.read).length || 0
          setUnreadCount(unread)
        }
      } catch (error) {
        console.error('Error fetching notification count:', error)
      }
    }

    fetchUnreadCount()
    
    // Poll every 30 seconds for new notifications
    const interval = setInterval(fetchUnreadCount, 30000)
    
    return () => clearInterval(interval)
  }, [])

  const handleClick = () => {
    // Always go to notification page - let the page handle authentication
    console.log("Going to notification page");
    router.push('/notification');
  }

  const isCompact = variant === 'compact'

  const buttonClass = cn(
    isCompact
      ? "relative inline-flex items-center justify-center rounded-full p-2 transition-colors text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      : "flex items-center rounded-xl text-left transition-colors w-full relative",
    !isCompact && (collapsed ? "justify-center gap-0 px-2 py-3" : "gap-4 px-4 py-3"),
    isCompact && isActive && "text-accent-foreground",
    !isCompact && (
      isActive
        ? "bg-accent text-accent-foreground font-medium"
        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
    )
  )

  const iconClass = isCompact ? "h-5 w-5" : "h-7 w-7"
  const badgeClass = isCompact
    ? "absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center"
    : "absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center"

  return (
    <button
      onClick={handleClick}
      className={buttonClass}
      title={isCompact || collapsed ? "Notifications" : undefined}
      aria-label={isCompact ? "Notifications" : undefined}
      type="button"
    >
      <div className="relative">
        <Heart className={cn(iconClass, !isCompact && isActive ? "stroke-2" : "stroke-1")} />
        {unreadCount > 0 && (
          <span className={badgeClass}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </div>
      {!isCompact && !collapsed && <span className="text-xl font-normal">Notification</span>}
    </button>
  )
}