"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Heart } from "lucide-react"
import { cn } from "@/lib/utils"

interface NotificationLinkProps {
  isActive: boolean
}

export function NotificationLink({ isActive }: NotificationLinkProps) {
  const { data: session } = useSession()
  const router = useRouter()

  const handleClick = () => {
    if (session) {
      // User is authenticated, go directly to notification
      console.log("User authenticated, going to notification page");
      router.push('/notification');
    } else {
      // User is not authenticated, go to sign in
      console.log("User not authenticated, going to sign in");
      localStorage.setItem('redirectAfterLogin', '/notification');
      router.push('/auth/signin?callbackUrl=/notification');
    }
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        "flex items-center gap-4 rounded-xl px-4 py-3 text-left transition-colors w-full",
        isActive
          ? "bg-accent text-accent-foreground font-medium"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      )}
    >
      <Heart className={cn("h-7 w-7", isActive ? "stroke-2" : "stroke-1")} />
      <span className="text-xl font-normal">Notification</span>
    </button>
  )
}