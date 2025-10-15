"use client"

import { useEffect, useState, type MouseEvent } from "react"
import { useRouter } from "next/navigation"
import { Layout } from "@/components/layout/Layout"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { PostCard } from "@/components/post/PostCard"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useSession } from "next-auth/react"
import { MapPin, Link as LinkIcon, Calendar } from "lucide-react"
import { useDataWithCache } from '@/hooks/use-data-cache'
import { FollowModal } from "@/components/profile/FollowModal"
import { cn } from "@/lib/utils"

type FollowStats = {
  followers: number
  following: number
}

type UserProfileData = {
  id?: string | null
  name?: string | null
  username?: string | null
  email?: string | null
  avatar?: string | null
  image?: string | null
  verified?: boolean | null
  bio?: string | null
  location?: string | null
  website?: string | null
  createdAt?: string | Date | null
  followers?: number | null
  following?: number | null
}

type UserPost = {
  id?: string | null
  _id?: string | null
  content?: string | null
  createdAt?: string | Date | null
  timestamp?: string | null
  likesCount?: number | null
  likes?: number | null
  commentsCount?: number | null
  replies?: number | null
  repostsCount?: number | null
  reposts?: number | null
  image?: string | null
  isLiked?: boolean
  isReposted?: boolean
}

export default function UserProfilePage({ params }: { params: { username: string } }) {
  const { data: session } = useSession()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const username = params.username
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isFollowing, setIsFollowing] = useState(false)
  const [isSelf, setIsSelf] = useState(false)
  const [followStats, setFollowStats] = useState<FollowStats>({ followers: 0, following: 0 })
  const [followLoading, setFollowLoading] = useState(false)
  const [followModalOpen, setFollowModalOpen] = useState(false)
  const [followModalTab, setFollowModalTab] = useState<'followers' | 'following'>('followers')

  const handleFollowHover = (event: MouseEvent<HTMLButtonElement>) => {
    if (isFollowing && !followLoading) {
      event.currentTarget.innerText = 'Unfollow'
    }
  }

  const handleFollowLeave = (event: MouseEvent<HTMLButtonElement>) => {
    if (isFollowing && !followLoading) {
      event.currentTarget.innerText = 'Following'
    }
  }
  
  // Set mounted state after component mounts
  useEffect(() => {
    setMounted(true)
  }, [])
  
  // Check if current user is following the profile user
  useEffect(() => {
    const checkFollowStatus = async () => {
      if (!session?.user || !username || !mounted) return;
      
      try {
        const response = await fetch(`/api/users/follow/status?username=${encodeURIComponent(username)}`)
        if (response.ok) {
          const data = await response.json() as {
            isFollowing?: boolean
            isSelf?: boolean
            stats?: Partial<FollowStats>
          }
          setIsFollowing(Boolean(data.isFollowing))
          setIsSelf(Boolean(data.isSelf))
          const stats = data.stats
          if (stats) {
            setFollowStats(prev => ({
              followers: typeof stats.followers === 'number' ? stats.followers : prev.followers,
              following: typeof stats.following === 'number' ? stats.following : prev.following
            }))
          }
        }
      } catch (error) {
        console.error('Error checking follow status:', error)
      }
    };
    
    checkFollowStatus()
  }, [session, username, mounted])
  // Cache user posts with our custom hook
  const {
    data: userPosts = [],
    isLoading: loadingPosts
  } = useDataWithCache<UserPost[]>(
    `profile-${username}-posts`,
    async () => {
      try {
        // Clear any previous errors
        console.log('Fetching profile for username:', username)
        
        // Sanitize and normalize the username 
        // - Remove leading/trailing whitespace
        // - Replace spaces with underscores
        // - Ensure proper encoding of special characters
        const normalizedUsername = username.trim().replace(/\s+/g, '_');
        const encodedUsername = encodeURIComponent(normalizedUsername);
        console.log(`Normalized username: "${normalizedUsername}" (encoded: ${encodedUsername})`);
        
        // Fetch by username - using our new API endpoint
        const response = await fetch(`/api/users/username/${encodedUsername}`)
        if (response.ok) {
          const data = await response.json() as { user?: UserProfileData }
          
          // Store the user profile data
          if (data.user) {
            setUserProfile(data.user)
          }
          console.log('Found user profile:', data.user?.username || username)
          
          // Now fetch posts by this user's identifier (username or email)
          const identifier = data.user?.username || data.user?.email
          
          if (identifier) {
            console.log('Fetching posts for user:', identifier)
            const postsResponse = await fetch(`/api/posts/user/${encodeURIComponent(identifier)}`)
            
            if (postsResponse.ok) {
              const postsData = await postsResponse.json()
              if (Array.isArray(postsData)) {
                return postsData as UserPost[]
              }
              if (Array.isArray(postsData.posts)) {
                return postsData.posts as UserPost[]
              }
            }
          }
        } else {
          console.error(`User not found: @${username} (Status: ${response.status})`)
          
          // Attempt to get more detailed error information
          try {
            const errorData = await response.json()
            console.error('Error details:', errorData)
          } catch {
            // Response couldn't be parsed as JSON
          }
        }
        
        return []
      } catch (error) {
        console.error(`Error fetching user data for @${username}:`, error)
        return []
      } finally {
        setLoading(false)
      }
    },
    {
      enabled: !!username && mounted
    }
  )

  // Set mounted state after component mounts
  useEffect(() => {
    setMounted(true)
  }, [])
  
  // Add debug info about username to console
  useEffect(() => {
    if (mounted && username) {
      console.log(`Profile page for username: "${username}"`);
    }
  }, [mounted, username]);

  if (!mounted || loading) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto bg-background text-foreground min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
          <p className="ml-2 text-foreground">Loading profile...</p>
        </div>
      </Layout>
    )
  }

  if (!userProfile) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto bg-background text-foreground min-h-screen">
          <div className="p-6 text-center">
            <h1 className="text-2xl font-bold mb-2">User Not Found</h1>
            <p className="text-muted-foreground mb-4">The user @{username} doesn&apos;t exist or has been removed.</p>
            <div className="mb-6 p-4 bg-card rounded-lg">
              <p className="text-sm text-muted-foreground">If you believe this is an error, check for:</p>
              <ul className="text-sm text-left mt-2 list-disc list-inside">
                <li>Correct spelling of the username</li>
                <li>Case sensitivity (usernames may be case-sensitive)</li>
                <li>Special characters or spaces in the username</li>
              </ul>
            </div>
            <button 
              onClick={() => router.push('/')}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Return to Home
            </button>
            <div className="text-sm text-muted-foreground">
              <p>This could be because:</p>
              <ul className="list-disc list-inside mt-2 mb-4 text-left max-w-md mx-auto">
                <li>The username was typed incorrectly</li>
                <li>The user has changed their username</li>
                <li>The user has deleted their account</li>
              </ul>
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto bg-background text-foreground min-h-screen pb-20">
        <div className="relative">
          <div className="h-24 md:h-32 bg-accent"></div>
          
          <div className="px-4 md:px-6 pb-6">
            <div className="relative pt-16 md:pt-0">
              <div className="flex flex-col gap-6">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3 md:gap-6 w-full">
                    <Avatar
                      className={cn(
                        "w-20 h-20 border-2 border-background rounded-full -mt-16 sm:-mt-12",
                        "md:w-24 md:h-24 md:border-4 md:absolute md:-top-12"
                      )}
                    >
                      <AvatarImage src={userProfile.avatar ?? undefined} alt={userProfile.name ?? 'Profile avatar'} />
                      <AvatarFallback className="text-lg md:text-2xl">
                        {userProfile.name ? userProfile.name[0].toUpperCase() : "?"}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex flex-col items-center sm:items-start text-center sm:text-left gap-1.5 w-full md:pl-28">
                      <div className="flex flex-col items-center sm:items-start gap-0.5 w-full">
                        <h1 className="text-base md:text-xl font-bold break-words max-w-full">{userProfile.name}</h1>
                        <span className="text-xs md:text-base text-muted-foreground break-all">@{username}</span>
                      </div>

                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs md:text-sm">
                        <div className="text-center">
                          <span className="block font-semibold">{userPosts.length}</span>
                          <span className="text-muted-foreground">Posts</span>
                        </div>
                        <button
                          onClick={() => {
                            setFollowModalTab('followers')
                            setFollowModalOpen(true)
                          }}
                          className="text-center hover:underline"
                          type="button"
                        >
                          <span className="block font-semibold">{followStats.followers}</span>
                          <span className="text-muted-foreground">Followers</span>
                        </button>
                        <button
                          onClick={() => {
                            setFollowModalTab('following')
                            setFollowModalOpen(true)
                          }}
                          className="text-center hover:underline"
                          type="button"
                        >
                          <span className="block font-semibold">{followStats.following}</span>
                          <span className="text-muted-foreground">Following</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex w-full md:w-auto justify-center md:justify-end">
                    <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                      {isSelf ? (
                        <button 
                          onClick={() => router.push('/profile')}
                          className="w-full sm:w-auto px-3 md:px-4 py-2 border border-border rounded-full text-xs md:text-sm font-medium"
                          type="button"
                        >
                          Edit Profile
                        </button>
                      ) : session ? (
                        <button 
                          onClick={async () => {
                            if (followLoading) return
                            setFollowLoading(true)
                            
                            try {
                              console.log('[Follow Button] Sending request for username:', username)
                              const response = await fetch('/api/users/follow', {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                  targetUsername: username,
                                  action: isFollowing ? 'unfollow' : 'follow'
                                })
                              })
                              
                              if (response.ok) {
                                const data = await response.json() as {
                                  isFollowing?: boolean
                                  stats?: Partial<FollowStats>
                                }
                                const nextFollowing = Boolean(data.isFollowing)
                                setIsFollowing(nextFollowing)
                                
                                if (data.stats) {
                                  const { followers, following } = data.stats
                                  setFollowStats(prev => ({
                                    followers: typeof followers === 'number' ? followers : prev.followers,
                                    following: typeof following === 'number' ? following : prev.following
                                  }))
                                } else {
                                  setFollowStats(prev => ({
                                    ...prev,
                                    followers: nextFollowing ? prev.followers + 1 : Math.max(prev.followers - 1, 0)
                                  }))
                                }
                                console.log('[Follow Button] Success:', { isFollowing: nextFollowing })
                              } else {
                                const errorData = await response.json()
                                console.error('[Follow Button] Error response:', errorData)
                                alert(`Failed to ${isFollowing ? 'unfollow' : 'follow'}: ${errorData.error || 'Unknown error'}`)
                              }
                            } catch (error) {
                              console.error('[Follow Button] Exception:', error)
                              alert(`Error: ${error instanceof Error ? error.message : 'Failed to update follow status'}`)
                            } finally {
                              setFollowLoading(false)
                            }
                          }}
                          disabled={followLoading}
                          className={`px-3 md:px-4 py-2 rounded-full text-xs md:text-sm font-medium ${
                            isFollowing 
                              ? 'border border-border hover:bg-red-500/10 hover:text-red-500 hover:border-red-500 group' 
                              : 'bg-primary text-primary-foreground hover:bg-primary/80'
                          } transition-colors w-full sm:w-auto`}
                          onMouseEnter={handleFollowHover}
                          onMouseLeave={handleFollowLeave}
                          type="button"
                        >
                          {followLoading 
                            ? <span className="inline-block h-3 w-3 md:h-4 md:w-4 border-2 border-current rounded-full border-b-transparent animate-spin" /> 
                            : isFollowing 
                              ? 'Following' 
                              : 'Follow'}
                        </button>
                      ) : (
                        <button 
                          onClick={() => {
                            localStorage.setItem('redirectAfterLogin', `/profile/${username}`);
                            router.push('/auth/signin');
                          }}
                          className="w-full sm:w-auto px-3 md:px-4 py-2 bg-primary text-primary-foreground rounded-full text-xs md:text-sm font-medium"
                          type="button"
                        >
                          Follow
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {userProfile.bio && (
                  <p className="text-sm md:text-base text-foreground/90 text-center md:text-left">{userProfile.bio}</p>
                )}

                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 md:gap-4 text-muted-foreground text-xs md:text-sm">
                  {userProfile.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 md:h-4 md:w-4" />
                      <span>{userProfile.location}</span>
                    </div>
                  )}
                  
                  {userProfile.website && (
                    <div className="flex items-center gap-1 max-w-full">
                      <LinkIcon className="h-3 w-3 md:h-4 md:w-4" />
                      <a
                        href={userProfile.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline truncate max-w-[160px] sm:max-w-[200px]"
                      >
                        {userProfile.website.replace(/(^\w+:|^)\/\//, '')}
                      </a>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3 md:h-4 md:w-4" />
                    <span>Joined {new Date(userProfile.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <Tabs defaultValue="posts" className="mt-4 md:mt-6">
              <TabsList className="grid grid-cols-4 w-full border-b border-border rounded-none bg-transparent h-auto p-0">
                <TabsTrigger 
                  value="posts" 
                  className="w-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-2 px-2 md:px-4 text-xs md:text-sm text-center"
                >
                  Posts
                </TabsTrigger>
                <TabsTrigger 
                  value="replies" 
                  className="w-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-2 px-2 md:px-4 text-xs md:text-sm text-center"
                >
                  Replies
                </TabsTrigger>
                <TabsTrigger 
                  value="media" 
                  className="w-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-2 px-2 md:px-4 text-xs md:text-sm text-center"
                >
                  Media
                </TabsTrigger>
                <TabsTrigger 
                  value="likes" 
                  className="w-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-2 px-2 md:px-4 text-xs md:text-sm text-center"
                >
                  Likes
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="posts" className="mt-6">
                {loadingPosts ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-foreground"></div>
                    <p className="ml-2 text-muted-foreground">Loading posts...</p>
                  </div>
                ) : !userPosts || userPosts.length === 0 ? (
                  <div className="text-center py-16">
                    <h2 className="text-2xl font-bold text-muted-foreground mb-2">No posts yet</h2>
                    <p className="text-muted-foreground">When {userProfile.name || username} posts, you&apos;ll see them here.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {userPosts.map((post, index) => {
                      const postId = post.id ?? post._id ?? `post-${index}`
                      const timestampValue = typeof post.createdAt === 'string'
                        ? post.createdAt
                        : typeof post.timestamp === 'string'
                          ? post.timestamp
                          : new Date().toISOString()
                      return (
                        <div key={postId} className="py-4">
                          <PostCard 
                            id={post.id ?? post._id ?? undefined}
                            user={{
                              name: userProfile.name ?? username,
                              username,
                              avatar: userProfile.avatar ?? undefined,
                              verified: Boolean(userProfile.verified)
                            }}
                            content={post.content ?? ''}
                            timestamp={timestampValue}
                            likes={(post.likesCount ?? post.likes) ?? 0}
                            replies={(post.commentsCount ?? post.replies) ?? 0}
                            reposts={(post.repostsCount ?? post.reposts) ?? 0}
                            image={post.image ?? undefined}
                            isLiked={Boolean(post.isLiked)}
                            isReposted={Boolean(post.isReposted)}
                          />
                        </div>
                      )
                    })}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="replies" className="mt-6">
                <div className="text-center py-16">
                  <h2 className="text-2xl font-bold text-muted-foreground mb-2">No replies yet</h2>
                  <p className="text-muted-foreground">When {userProfile.name || username} replies to others, you&apos;ll see them here.</p>
                </div>
              </TabsContent>
              
              <TabsContent value="media" className="mt-6">
                <div className="text-center py-16">
                  <h2 className="text-2xl font-bold text-muted-foreground mb-2">No media yet</h2>
                  <p className="text-muted-foreground">When {userProfile.name || username} shares media, you&apos;ll see it here.</p>
                </div>
              </TabsContent>
              
              <TabsContent value="likes" className="mt-6">
                <div className="text-center py-16">
                  <h2 className="text-2xl font-bold text-muted-foreground mb-2">No likes yet</h2>
                  <p className="text-muted-foreground">{userProfile.name || username} hasn&apos;t liked any posts yet.</p>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      <FollowModal
        username={username}
        isOpen={followModalOpen}
        onClose={() => setFollowModalOpen(false)}
        initialTab={followModalTab}
      />
    </Layout>
  )
}