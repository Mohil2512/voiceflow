"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Layout } from "@/components/layout/Layout"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { PostCard } from "@/components/post/PostCard"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useSession } from "next-auth/react"
import { MapPin, Link as LinkIcon, Calendar } from "lucide-react"
import { useDataWithCache } from '@/hooks/use-data-cache'

export default function UserProfilePage({ params }: { params: { username: string } }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const username = params.username
  const [userProfile, setUserProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isFollowing, setIsFollowing] = useState(false)
  const [isSelf, setIsSelf] = useState(false)
  const [followStats, setFollowStats] = useState({ followers: 0, following: 0 })
  const [followLoading, setFollowLoading] = useState(false)
  
  // Set mounted state after component mounts
  useEffect(() => {
    setMounted(true)
  }, [])
  
  // Check if current user is following the profile user
  useEffect(() => {
    const checkFollowStatus = async () => {
      if (!session?.user || !username || !mounted) return;
      
      try {
        const response = await fetch(`/api/users/follow/status?username=${encodeURIComponent(username)}`);
        if (response.ok) {
          const data = await response.json();
          setIsFollowing(data.isFollowing);
          setIsSelf(data.isSelf);
          setFollowStats(data.stats);
        }
      } catch (error) {
        console.error('Error checking follow status:', error);
      }
    };
    
    checkFollowStatus();
  }, [session, username, mounted]);

  // Set mounted state after component mounts
  useEffect(() => {
    setMounted(true)
  }, [])

  // Cache user posts with our custom hook
  const {
    data: userPosts = [],
    isLoading: loadingPosts,
    refetch: refreshPosts
  } = useDataWithCache(
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
          const data = await response.json()
          
          // Store the user profile data
          setUserProfile(data.user)
          console.log('Found user profile:', data.user?.username || username)
          
          // Now fetch posts by this user's identifier (username or email)
          const identifier = data.user?.username || data.user?.email
          
          if (identifier) {
            console.log('Fetching posts for user:', identifier)
            const postsResponse = await fetch(`/api/posts/user/${encodeURIComponent(identifier)}`)
            
            if (postsResponse.ok) {
              const postsData = await postsResponse.json()
              if (postsData.posts && Array.isArray(postsData.posts)) {
                return postsData.posts
              }
            }
          }
        } else {
          console.error(`User not found: @${username} (Status: ${response.status})`)
          
          // Attempt to get more detailed error information
          try {
            const errorData = await response.json()
            console.error('Error details:', errorData)
          } catch (parseError) {
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
            <p className="text-muted-foreground mb-4">The user @{username} doesn't exist or has been removed.</p>
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
          <div className="h-32 bg-accent"></div>
          
          <div className="px-6 pb-6">
            <div className="flex justify-between items-start relative">
              <Avatar className="w-24 h-24 border-4 border-background rounded-full absolute -top-12">
                <AvatarImage src={userProfile.avatar || ""} alt={userProfile.name} />
                <AvatarFallback className="text-2xl">
                  {userProfile.name ? userProfile.name[0].toUpperCase() : "?"}
                </AvatarFallback>
              </Avatar>
              
              <div className="w-24 h-12"></div>
              
              <div className="mt-4 flex space-x-2">
                {isSelf ? (
                  <button 
                    onClick={() => router.push('/profile')}
                    className="px-4 py-1 border border-border rounded-full text-sm font-medium"
                  >
                    Edit Profile
                  </button>
                ) : session ? (
                  <button 
                    onClick={async () => {
                      if (followLoading) return;
                      setFollowLoading(true);
                      
                      try {
                        const response = await fetch('/api/users/follow', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json'
                          },
                          body: JSON.stringify({
                            targetUsername: username,
                            action: isFollowing ? 'unfollow' : 'follow'
                          })
                        });
                        
                        if (response.ok) {
                          const data = await response.json();
                          setIsFollowing(data.isFollowing);
                          
                          // Update follow stats (simple optimistic update)
                          setFollowStats(prev => ({
                            ...prev,
                            followers: isFollowing ? prev.followers - 1 : prev.followers + 1
                          }));
                        }
                      } catch (error) {
                        console.error('Error updating follow status:', error);
                      } finally {
                        setFollowLoading(false);
                      }
                    }}
                    disabled={followLoading}
                    className={`px-4 py-1 rounded-full text-sm font-medium ${
                      isFollowing 
                        ? 'border border-border hover:bg-red-500/10 hover:text-red-500 hover:border-red-500 group' 
                        : 'bg-primary text-primary-foreground hover:bg-primary/80'
                    } transition-colors`}
                    onMouseEnter={(e) => {
                      if (isFollowing && !followLoading) {
                        e.currentTarget.innerText = 'Unfollow';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (isFollowing && !followLoading) {
                        e.currentTarget.innerText = 'Following';
                      }
                    }}
                  >
                    {followLoading 
                      ? <span className="inline-block h-4 w-4 border-2 border-current rounded-full border-b-transparent animate-spin" /> 
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
                    className="px-4 py-1 bg-primary text-primary-foreground rounded-full text-sm font-medium"
                  >
                    Follow
                  </button>
                )}
              </div>
            </div>

            <div className="mt-6">
              <div className="flex flex-col">
                <h1 className="text-xl font-bold">{userProfile.name}</h1>
                <span className="text-muted-foreground">@{username}</span>
                
                <div className="flex mt-2 space-x-4 text-sm">
                  <div>
                    <span className="font-bold">{followStats.following}</span> 
                    <span className="text-muted-foreground ml-1">Following</span>
                  </div>
                  <div>
                    <span className="font-bold">{followStats.followers}</span> 
                    <span className="text-muted-foreground ml-1">Followers</span>
                  </div>
                </div>
              </div>

              {userProfile.bio && (
                <p className="mt-4 text-foreground">{userProfile.bio}</p>
              )}

              <div className="flex flex-wrap gap-4 mt-4 text-muted-foreground text-sm">
                {userProfile.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    <span>{userProfile.location}</span>
                  </div>
                )}
                
                {userProfile.website && (
                  <div className="flex items-center gap-1">
                    <LinkIcon className="h-4 w-4" />
                    <a href={userProfile.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      {userProfile.website.replace(/(^\w+:|^)\/\//, '')}
                    </a>
                  </div>
                )}
                
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>Joined {new Date(userProfile.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                </div>
              </div>

              <div className="flex gap-5 mt-4">
                <div>
                  <span className="font-semibold">{userProfile.following || 0}</span>{" "}
                  <span className="text-muted-foreground">Following</span>
                </div>
                <div>
                  <span className="font-semibold">{userProfile.followers || 0}</span>{" "}
                  <span className="text-muted-foreground">Followers</span>
                </div>
              </div>
            </div>
            
            <Tabs defaultValue="posts" className="mt-6">
              <TabsList className="w-full justify-start border-b border-border rounded-none bg-transparent h-auto p-0">
                <TabsTrigger 
                  value="posts" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-2 px-4"
                >
                  Posts
                </TabsTrigger>
                <TabsTrigger 
                  value="replies" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-2 px-4"
                >
                  Replies
                </TabsTrigger>
                <TabsTrigger 
                  value="media" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-2 px-4"
                >
                  Media
                </TabsTrigger>
                <TabsTrigger 
                  value="likes" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-2 px-4"
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
                    <p className="text-muted-foreground">When {userProfile.name || username} posts, you'll see them here.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {userPosts.map((post: any) => (
                      <div key={post.id || post._id} className="py-4">
                        <PostCard 
                          id={post.id || post._id}
                          user={{
                            name: userProfile.name,
                            username: username,
                            avatar: userProfile.avatar,
                            verified: userProfile.verified
                          }}
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
                    ))}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="replies" className="mt-6">
                <div className="text-center py-16">
                  <h2 className="text-2xl font-bold text-muted-foreground mb-2">No replies yet</h2>
                  <p className="text-muted-foreground">When {userProfile.name || username} replies to others, you'll see them here.</p>
                </div>
              </TabsContent>
              
              <TabsContent value="media" className="mt-6">
                <div className="text-center py-16">
                  <h2 className="text-2xl font-bold text-muted-foreground mb-2">No media yet</h2>
                  <p className="text-muted-foreground">When {userProfile.name || username} shares media, you'll see it here.</p>
                </div>
              </TabsContent>
              
              <TabsContent value="likes" className="mt-6">
                <div className="text-center py-16">
                  <h2 className="text-2xl font-bold text-muted-foreground mb-2">No likes yet</h2>
                  <p className="text-muted-foreground">{userProfile.name || username} hasn't liked any posts yet.</p>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </Layout>
  )
}