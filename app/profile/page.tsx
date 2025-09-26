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
import { EditProfileCard } from "@/components/profile/EditProfileCard"
import { useAppData } from '@/providers/data-provider'
import { useDataWithCache } from '@/hooks/use-data-cache'
import { RefreshButton } from '@/components/ui/refresh-button'

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [editProfileOpen, setEditProfileOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [initialPostsLoad, setInitialPostsLoad] = useState(true)
  const { wasRefreshed } = useAppData()
  
  // Set mounted state after component mounts
  useEffect(() => {
    setMounted(true)
  }, [])
  

  
  // Combined state for both profile and posts data
  const [profileData, setProfileData] = useState<any>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  
  // Fetch user profile data AND posts in single API call
  useEffect(() => {
    const fetchProfileData = async () => {
      if (session?.user?.email) {
        try {
          setProfileLoading(true)
          console.log('Fetching profile and posts data...')
          const response = await fetch('/api/users/me')
          if (response.ok) {
            const data = await response.json()
            console.log('Profile and posts data fetched:', data)
            setUserProfile(data.user)
            setProfileData(data)
            setInitialPostsLoad(false) // Stop loading immediately
          } else {
            console.error('Failed to fetch profile data:', response.status)
          }
        } catch (error) {
          console.error('Error fetching profile data:', error)
        } finally {
          setProfileLoading(false)
        }
      }
    }
    
    fetchProfileData()
  }, [session?.user?.email, editProfileOpen]) // Refetch when profile dialog closes
  
  // Get posts from the combined profile data
  const userPosts = profileData?.posts || []
  const loading = profileLoading
  
  // Simplified reposts - can be added to the combined API later if needed
  const userReposts: any[] = []
  const loadingReposts = profileLoading
  

  
  if (status === "loading" || !mounted) {
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
    // Save the current path for redirection after login
    useEffect(() => {
      if (status === "unauthenticated") {
        localStorage.setItem('redirectAfterLogin', window.location.pathname)
        router.push(`/auth/signin?callbackUrl=${encodeURIComponent(window.location.pathname)}`)
      }
    }, [status, router])
    
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
                <p className="text-muted-foreground mb-4">Redirecting to sign in...</p>
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

  // If we reach here, user should be authenticated with a valid session
  const currentUser = {
    name: userProfile?.name || session?.user?.name || "User",
    username: userProfile?.username || session?.user?.username || session?.user?.email?.split("@")[0] || "user",
    avatar: userProfile?.image || session?.user?.image || "/placeholder.svg",
    bio: userProfile?.bio || (session?.user as any)?.bio || "Welcome to my profile! This is where I share my thoughts and connect with others.",
    joinDate: "Recently joined",
    location: "",
    website: "",
    following: 0,
    followers: 0
  }
  
  // Log profile data for debugging
  console.log("User profile data:", userProfile)
  console.log("Session user data:", session?.user)
  console.log("Current user object:", currentUser)

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
              <AvatarImage src={currentUser.avatar} alt={currentUser.username} />
              <AvatarFallback className="text-xl">
                {currentUser.name[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-2xl font-bold">{currentUser.name}</h1>
                  <p className="text-muted-foreground mb-3">{currentUser.username}</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setEditProfileOpen(true)}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Edit profile
                </Button>
              </div>
              
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
          </div>

          <Tabs defaultValue="posts" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="posts">Posts</TabsTrigger>
              <TabsTrigger value="replies">Replies</TabsTrigger>
              <TabsTrigger value="reposts">Reposts</TabsTrigger>
            </TabsList>
            
            <TabsContent value="posts" className="mt-6">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-foreground"></div>
                  <p className="ml-2 text-muted-foreground">Loading posts...</p>
                </div>
              ) : !userPosts || userPosts.length === 0 ? (
                <div className="text-center py-16">
                  <h2 className="text-2xl font-bold text-muted-foreground mb-2">No posts yet</h2>
                  <p className="text-muted-foreground mb-4">When you post something, it will show up here.</p>
                  <Button onClick={() => router.push("/create")}>
                    Create your first post
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {userPosts && userPosts.map((post, index) => {
                    // Determine the user object depending on data structure
                    const userObject = post.user || 
                                      post.author || 
                                      { 
                                        name: session?.user?.name || "User",
                                        username: session?.user?.username || session?.user?.email?.split("@")[0] || "user",
                                        avatar: session?.user?.image || "/placeholder.svg"
                                      };
                    
                    // Ensure we have a valid ID for the key prop
                    const postId = post._id || post.id || `post-${index}-${Date.now()}`;
                    
                    console.log("Rendering post:", { id: postId, user: userObject, content: post.content });
                    
                    return (
                      <div key={postId} className="py-4">
                        <PostCard 
                          id={postId}
                          user={userObject}
                          content={post.content}
                          timestamp={post.createdAt || post.timestamp}
                          likes={post.likesCount || post.likes || 0}
                          replies={post.commentsCount || post.replies || 0}
                          reposts={post.repostsCount || post.reposts || 0}
                          image={post.image}
                          isLiked={post.isLiked || false}
                          isReposted={post.isReposted || false}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="replies" className="mt-6">
              <div className="text-center py-16">
                <h2 className="text-2xl font-bold text-muted-foreground mb-2">No replies yet</h2>
                <p className="text-muted-foreground">When you reply to posts, they will show up here.</p>
              </div>
            </TabsContent>
            
            <TabsContent value="reposts" className="mt-6">
              {/* Remove console.log statement that was causing errors */}
              {loadingReposts ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-foreground"></div>
                  <p className="ml-2 text-muted-foreground">Loading reposts...</p>
                </div>
              ) : !userReposts || userReposts.length === 0 ? (
                <div className="text-center py-16">
                  <h2 className="text-2xl font-bold text-muted-foreground mb-2">No reposts yet</h2>
                  <p className="text-muted-foreground">When you repost content, it will show up here.</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {userReposts && userReposts.map((post: any, index: number) => {
                    // Determine the user object depending on data structure
                    const userObject = post.user || 
                                      post.author || 
                                      post.originalAuthor ||
                                      { 
                                        name: session?.user?.name || "User",
                                        username: session?.user?.username || session?.user?.email?.split("@")[0] || "user",
                                        avatar: session?.user?.image || "/placeholder.svg"
                                      };
                    
                    // Ensure we have a valid ID for the key prop
                    const postId = post.id || post._id || `repost-${index}-${Date.now()}`;
                    
                    console.log(`Rendering repost #${index}:`, postId, userObject);
                    
                    return (
                      <div key={postId} className="py-4">
                        <div className="pl-8 pb-1 text-sm text-muted-foreground">
                          <span>You reposted</span>
                        </div>
                        <PostCard 
                          id={postId}
                          user={userObject}
                          content={post.content || ""}
                          timestamp={post.createdAt || post.timestamp || new Date().toISOString()}
                          likes={post.likesCount || post.likes || 0}
                          replies={post.commentsCount || post.replies || 0}
                          reposts={post.repostsCount || post.reposts || 0}
                          image={post.image}
                          isLiked={post.isLiked || false}
                          isReposted={true} // Always true since this is a repost
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
        
        {/* Edit Profile Dialog */}
        <EditProfileCard
          open={editProfileOpen}
          onOpenChange={setEditProfileOpen}
          currentUser={currentUser}
          onProfileUpdated={() => {
            // Trigger combined profile and posts data refetch
            const fetchProfileData = async () => {
              try {
                const response = await fetch('/api/users/me')
                if (response.ok) {
                  const data = await response.json()
                  setUserProfile(data.user)
                  setProfileData(data)
                }
              } catch (error) {
                console.error('Error refetching profile data:', error)
              }
            }
            fetchProfileData()
          }}
        />
      </div>
    </Layout>
  )
}
