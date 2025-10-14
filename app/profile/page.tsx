"use client"

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { PostCard } from '@/components/post/PostCard'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Layout } from '@/components/layout/Layout'
import { InlineLoginPrompt } from '@/components/layout/InlineLoginPrompt'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EditProfileCard } from '@/components/profile/EditProfileCard'

interface UserProfile {
  id: string
  name?: string | null
  email?: string | null
  image?: string | null
  bio?: string | null
  username?: string | null
  isVerified?: boolean
}

interface Post {
  id: string
  content: string
  timestamp: string
  user: {
    name: string
    username: string
    avatar?: string
    verified?: boolean
    email?: string
  }
  likes?: number
  replies?: number
  reposts?: number
  image?: string
  images?: string[]
  isLiked?: boolean
  isReposted?: boolean
  canEdit?: boolean
  repostContext?: {
    name?: string
    username?: string
    avatar?: string
    email?: string
  }
  originalPostId?: string | null
  isRepostEntry?: boolean
}

export default function Profile() {
  const { data: session, status } = useSession()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [reposts, setReposts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [showEditProfile, setShowEditProfile] = useState(false)
  const [activeTab, setActiveTab] = useState('posts')

  const fetchProfileData = useCallback(async (userEmail: string) => {
    if (!userEmail) return
    
    try {
      const response = await fetch(`/api/users/${userEmail}`)
      if (response.ok) {
        const userData = await response.json()
        setProfile(userData)
      } else {
        setError('Failed to load profile')
      }
    } catch (error) {
      setError('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchUserPosts = useCallback(async (userEmail: string) => {
    if (!userEmail) return

    try {
      console.log('Fetching posts for user:', userEmail)
      const response = await fetch(`/api/posts/user/${userEmail}`)
      if (response.ok) {
        const data = await response.json()
        console.log('Posts API response:', data)
        
        // The API now returns an array directly
        const userPosts = Array.isArray(data) ? data : []
        setPosts(userPosts)
        console.log('Set posts:', userPosts.length)
      } else {
        console.error('API response not ok:', response.status)
        setPosts([])
      }
    } catch (error) {
      console.error('Error fetching user posts:', error)
      setPosts([])
    }
  }, [])

  const fetchUserReposts = useCallback(async (userEmail: string) => {
    if (!userEmail) return

    try {
      const response = await fetch(`/api/posts/reposts/${encodeURIComponent(userEmail)}`)
      if (response.ok) {
        const data = await response.json()
        const userReposts = Array.isArray(data) ? data : Array.isArray(data?.reposts) ? data.reposts : []
        setReposts(userReposts)
      } else {
        setReposts([])
      }
    } catch (error) {
      console.error('Error fetching user reposts:', error)
      setReposts([])
    }
  }, [])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && status === 'authenticated' && session?.user?.email && !profile) {
      fetchProfileData(session.user.email)
      fetchUserPosts(session.user.email)
      fetchUserReposts(session.user.email)
    } else if (mounted && status === 'unauthenticated') {
      setLoading(false)
      setError('Please sign in to view your profile')
    }
  }, [mounted, status, session?.user?.email, profile, fetchProfileData, fetchUserPosts, fetchUserReposts])

  if (!mounted) return null

  if (status === 'loading' || loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
        </div>
      </Layout>
    )
  }

  if (error || status === 'unauthenticated') {
    // Show inline login prompt for unauthenticated users
    if (status === 'unauthenticated') {
      return <InlineLoginPrompt type="profile" />
    }
    
    // Show error message for other errors
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-screen">
          <p className="text-center text-destructive">{error}</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        {/* Profile Header */}
        <div className="px-6 py-8 border-b border-border">
          <div className="flex items-start gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profile?.image || '/placeholder.svg'} alt={profile?.name || 'Profile'} />
              <AvatarFallback className="text-2xl">
                {profile?.name?.[0] || profile?.username?.[0] || 'U'}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold">{profile?.name || 'User'}</h1>
                {profile?.isVerified && (
                  <Badge variant="secondary" className="text-xs">
                    ✓
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground mb-3">
                @{profile?.username || profile?.email?.split('@')[0] || 'user'}
              </p>
              {profile?.bio && (
                <p className="text-sm mb-4">{profile.bio}</p>
              )}
              <div className="flex gap-4 text-sm text-muted-foreground">
                <span>{Array.isArray(posts) ? posts.length : 0} posts</span>
              </div>
            </div>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowEditProfile(true)}
            >
              Edit profile
            </Button>
          </div>
        </div>

        {/* Tabs for Posts, Replies, Reposts */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="posts">Posts</TabsTrigger>
            <TabsTrigger value="replies">Replies</TabsTrigger>
            <TabsTrigger value="reposts">Reposts</TabsTrigger>
          </TabsList>
          
          <TabsContent value="posts" className="mt-0">
            <div className="divide-y divide-border">
              {!Array.isArray(posts) || posts.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <p className="text-muted-foreground">No posts yet</p>
                </div>
              ) : (
                posts.map((post) => (
                  <PostCard 
                    key={post.id}
                    id={post.id}
                    content={post.content}
                    timestamp={post.timestamp}
                    user={post.user}
                    likes={post.likes || 0}
                    replies={post.replies || 0}
                    reposts={post.reposts || 0}
                    image={post.image}
                    images={post.images || []}
                    isLiked={post.isLiked || false}
                    isReposted={post.isReposted || false}
                    canEdit={post.canEdit}
                    repostContext={post.repostContext}
                    originalPostId={post.originalPostId}
                    isRepostEntry={post.isRepostEntry}
                    onPostUpdate={() => {
                      if (session?.user?.email) {
                        fetchUserPosts(session.user.email)
                        fetchUserReposts(session.user.email)
                      }
                    }}
                  />
                ))
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="replies" className="mt-0">
            <div className="px-6 py-12 text-center">
              <p className="text-muted-foreground">Replies functionality coming soon</p>
            </div>
          </TabsContent>
          
          <TabsContent value="reposts" className="mt-0">
            <div className="divide-y divide-border">
              {!Array.isArray(reposts) || reposts.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <p className="text-muted-foreground">No reposts yet</p>
                </div>
              ) : (
                reposts.map((post) => (
                  <PostCard
                    key={post.id}
                    id={post.id}
                    content={post.content}
                    timestamp={post.timestamp}
                    user={post.user}
                    likes={post.likes || 0}
                    replies={post.replies || 0}
                    reposts={post.reposts || 0}
                    image={post.image}
                    images={post.images || []}
                    isLiked={post.isLiked || false}
                    isReposted={post.isReposted || false}
                    canEdit={post.canEdit}
                    repostContext={post.repostContext}
                    originalPostId={post.originalPostId}
                    isRepostEntry={post.isRepostEntry}
                  />
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Edit Profile Modal */}
        {showEditProfile && (
          <EditProfileCard
            isOpen={showEditProfile}
            onClose={() => setShowEditProfile(false)}
            currentProfile={profile}
            onSuccess={(updatedProfile) => {
              setProfile(updatedProfile)
              setShowEditProfile(false)
              // Refresh posts to show updated profile data
              if (session?.user?.email) {
                fetchUserPosts(session.user.email)
                fetchUserReposts(session.user.email)
              }
            }}
          />
        )}
      </div>
    </Layout>
  )
}