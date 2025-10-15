"use client"

import { useRouter } from "next/navigation"
import { Heart } from "lucide-react"
import { cn } from "@/lib/utils"
import { useEffect, useState } from "react"

interface NotificationLinkProps {
  isActive: boolean
}

export function NotificationLink({ isActive }: NotificationLinkProps) {
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

  return (
    <button
      onClick={handleClick}
      className={cn(
        "flex items-center gap-4 rounded-xl px-4 py-3 text-left transition-colors w-full relative",
        isActive
          ? "bg-accent text-accent-foreground font-medium"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      )}
    >
      <div className="relative">
        <Heart className={cn("h-7 w-7", isActive ? "stroke-2" : "stroke-1")} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </div>
      <span className="text-xl font-normal">Notification</span>
    </button>
  )
}