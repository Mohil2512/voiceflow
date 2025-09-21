"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Layout } from "@/components/layout/Layout"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { PostCard } from "@/components/post/PostCard"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useSession } from "next-auth/react"
import { MapPin, Link as LinkIcon, Calendar, MoreHorizontal, Settings, User } from "lucide-react"

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [userPosts, setUserPosts] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Don't automatically redirect - let middleware handle authentication
  // This prevents redirect loops
  // useEffect(() => {
  //   if (status === "unauthenticated") {
  //     router.push("/auth/signin")
  //   }
  // }, [status, router])

  useEffect(() => {
    // Fetch user posts
    const fetchUserPosts = async () => {
      if (!session?.user?.email) return

      try {
        const response = await fetch(`/api/posts/user/${session.user.email}`)
        if (response.ok) {
          const data = await response.json()
          setUserPosts(data.posts || [])
        }
      } catch (error) {
        console.error('Error fetching user posts:', error)
      } finally {
        setLoading(false)
      }
    }

    if (session?.user) {
      fetchUserPosts()
    }
  }, [session])

  if (status === "loading") {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto bg-background text-foreground min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
          <p className="ml-2 text-foreground">Loading profile...</p>
        </div>
      </Layout>
    )
  }

  // Only show login prompt if explicitly unauthenticated
  if (status === "unauthenticated") {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto bg-background text-foreground min-h-screen">
          <div className="p-6 text-center">
            <div className="border border-border rounded-lg p-8">
              <div className="mb-4">
                <div className="w-20 h-20 bg-muted rounded-full mx-auto mb-4 flex items-center justify-center">
                  <User className="w-10 h-10 text-muted-foreground" />
                </div>
                <h1 className="text-2xl font-bold mb-2">Your Profile</h1>
                <p className="text-muted-foreground mb-4">Sign in to view and manage your profile</p>
              </div>
              <div className="space-y-3">
                <Button 
                  onClick={() => {
                    localStorage.setItem("redirectAfterLogin", "/profile")
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
  if (!session && status !== "unauthenticated") {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto bg-background text-foreground min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
          <p className="ml-2 text-foreground">Loading profile...</p>
        </div>
      </Layout>
    )
  }

  const currentUser = {
    name: session.user.name || "User",
    username: session.user.username || session.user.email?.split("@")[0] || "user",
    avatar: session.user.image || "/placeholder.svg",
    bio: "Welcome to my profile! This is where I share my thoughts and connect with others.",
    joinDate: "Recently joined",
    location: "",
    website: "",
    following: 0,
    followers: 0
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto bg-background text-foreground min-h-screen">
        {/* Header */}
        <div className="sticky top-0 bg-background/90 backdrop-blur-md border-b border-border p-4 z-10">
          <h1 className="text-xl font-bold">Profile</h1>
        </div>

        <div className="p-6">
          <div className="flex items-start gap-4 mb-6">
            <Avatar className="h-20 w-20">
              <AvatarImage src={currentUser.avatar} />
              <AvatarFallback className="text-xl">
                {currentUser.name[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{currentUser.name}</h1>
              <p className="text-muted-foreground mb-3">@{currentUser.username}</p>
              <p className="text-foreground mb-4">{currentUser.bio}</p>
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>Joined {currentUser.joinDate}</span>
                </div>
              </div>

              <div className="flex gap-4 text-sm">
                <span><strong>{currentUser.following}</strong> <span className="text-muted-foreground">Following</span></span>
                <span><strong>{currentUser.followers}</strong> <span className="text-muted-foreground">Followers</span></span>
              </div>
            </div>
            
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Edit profile
            </Button>
          </div>

          <Tabs defaultValue="posts" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="posts">Posts</TabsTrigger>
              <TabsTrigger value="replies">Replies</TabsTrigger>
              <TabsTrigger value="media">Media</TabsTrigger>
            </TabsList>
            
            <TabsContent value="posts" className="mt-6">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-foreground"></div>
                  <p className="ml-2 text-muted-foreground">Loading posts...</p>
                </div>
              ) : userPosts.length === 0 ? (
                <div className="text-center py-16">
                  <h2 className="text-2xl font-bold text-muted-foreground mb-2">No posts yet</h2>
                  <p className="text-muted-foreground mb-4">When you post something, it will show up here.</p>
                  <Button onClick={() => router.push("/create")}>
                    Create your first post
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {userPosts.map((post) => (
                    <div key={post.id} className="py-4">
                      <PostCard {...post} />
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="replies" className="mt-6">
              <div className="text-center py-16">
                <h2 className="text-2xl font-bold text-muted-foreground mb-2">No replies yet</h2>
                <p className="text-muted-foreground">When you reply to posts, they will show up here.</p>
              </div>
            </TabsContent>
            
            <TabsContent value="media" className="mt-6">
              <div className="text-center py-16">
                <h2 className="text-2xl font-bold text-muted-foreground mb-2">No media yet</h2>
                <p className="text-muted-foreground">Posts with photos and videos will appear here.</p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  )
}
