"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Layout } from "@/components/layout/Layout"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { Heart, MessageCircle, Repeat2, UserPlus, User } from "lucide-react"

const mockActivities = [
  {
    id: "1",
    type: "like",
    user: { name: "Sarah Johnson", username: "sarahj", avatar: "/placeholder.svg" },
    action: "liked your post",
    time: "2h",
    post: "Just launched my new design system..."
  },
  {
    id: "2", 
    type: "comment",
    user: { name: "Mike Chen", username: "mikec", avatar: "/placeholder.svg" },
    action: "commented on your post",
    time: "4h",
    post: "The latest updates to Voiceflow are incredible!"
  },
  {
    id: "3",
    type: "follow",
    user: { name: "Emily Davis", username: "emilyd", avatar: "/placeholder.svg" },
    action: "started following you",
    time: "1d",
  },
  {
    id: "4",
    type: "repost",
    user: { name: "Alex Turner", username: "alext", avatar: "/placeholder.svg" },
    action: "reposted your post",
    time: "2d",
    post: "Community feedback is so valuable for product development"
  }
]

const getActivityIcon = (type: string) => {
  switch (type) {
    case "like": return <Heart className="h-4 w-4 text-red-500" />
    case "comment": return <MessageCircle className="h-4 w-4 text-blue-500" />
    case "repost": return <Repeat2 className="h-4 w-4 text-green-500" />
    case "follow": return <UserPlus className="h-4 w-4 text-purple-500" />
    default: return null
  }
}

export default function ActivityPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  // Don't automatically redirect - let middleware handle authentication
  // This prevents redirect loops
  // useEffect(() => {
  //   if (status === "unauthenticated") {
  //     router.push("/auth/signin")
  //   }
  // }, [status, router])

  if (status === "loading") {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto p-6 flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto"></div>
            <p className="mt-2 text-foreground">Loading activity...</p>
          </div>
        </div>
      </Layout>
    )
  }

  // Only show login prompt if explicitly unauthenticated
  if (status === "unauthenticated") {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto p-6">
          <div className="text-center min-h-[400px] flex items-center justify-center">
            <div className="border border-border rounded-lg p-8 max-w-md w-full">
              <div className="mb-4">
                <div className="w-20 h-20 bg-muted rounded-full mx-auto mb-4 flex items-center justify-center">
                  <User className="w-10 h-10 text-muted-foreground" />
                </div>
                <h1 className="text-2xl font-bold mb-2">Your Activity</h1>
                <p className="text-muted-foreground mb-4">Sign in to view your notifications and activity</p>
              </div>
              <div className="space-y-3">
                <Button 
                  onClick={() => {
                    localStorage.setItem("redirectAfterLogin", "/activity")
                    window.location.href = "/auth/signin"
                  }}
                  className="w-full"
                >
                  Sign In
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  // Safety check - if we don't have a session but we're not explicitly unauthenticated,
  // show loading state (this handles edge cases during authentication)
  if (!session && status === "authenticated") {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto p-6 flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto"></div>
            <p className="mt-2 text-foreground">Loading activity...</p>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Activity</h1>
          <p className="text-muted-foreground">See what's happening with your posts and profile</p>
        </div>

        <div className="space-y-4">
          {mockActivities.map((activity) => (
            <Card key={activity.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-full bg-muted">
                    {getActivityIcon(activity.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={activity.user.avatar} />
                        <AvatarFallback>{activity.user.name[0]}</AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          <span className="font-semibold">{activity.user.name}</span>
                          <span className="text-muted-foreground ml-1">
                            @{activity.user.username}
                          </span>
                          <span className="ml-2">{activity.action}</span>
                        </p>
                        
                        {activity.post && (
                          <p className="text-sm text-muted-foreground mt-1 truncate">
                            "{activity.post}"
                          </p>
                        )}
                      </div>
                      
                      <span className="text-xs text-muted-foreground">{activity.time}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {mockActivities.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No recent activity</p>
          </div>
        )}
      </div>
    </Layout>
  )
}