"use client"

import { useSession } from 'next-auth/react'
import { PostCard } from "@/components/post/PostCard"
import { Layout } from "@/components/layout/Layout"
import { CreatePostModal } from "@/components/post/CreatePostModal"
import { useEffect, useState } from 'react'
import { useAppData } from '@/providers/data-provider'
import { useDataWithCache } from '@/hooks/use-data-cache'
import { RefreshButton } from '@/components/ui/refresh-button'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

// Define the post type to fix TypeScript errors
interface Post {
  id: string;
  content: string;
  timestamp: string;
  user?: {
    name: string;
    username: string;
    avatar?: string;
    verified?: boolean;
    email?: string;
  };
  likes?: number;
  replies?: number;
  reposts?: number;
  isLiked?: boolean;
  isReposted?: boolean;
  image?: string;
  [key: string]: any; // Allow other properties
}

export default function HomePage() {
  const { data: session, status } = useSession()
  const [mounted, setMounted] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const { posts: cachedPosts, setPosts: setCachedPosts, wasRefreshed } = useAppData()
  
  // Fetch posts with cache support
  const { 
    data: fetchedPosts, 
    isLoading, 
    refetch 
  } = useDataWithCache(
    'home-posts',
    async () => {
      try {
        // Check for local draft posts first
        const localPosts = localStorage.getItem('voiceflow_local_posts');
        let combinedPosts: Post[] = [];
        
        // Fetch from API with cache-busting timestamp
        const response = await fetch('/api/posts?timestamp=' + new Date().getTime());
        if (response.ok) {
          const data = await response.json();
          combinedPosts = data.posts || [];
          
          // If we also have local posts, combine them
          if (localPosts) {
            const parsedLocalPosts = JSON.parse(localPosts) as Post[];
            combinedPosts = [...parsedLocalPosts, ...combinedPosts];
          }
          
          // Store in global cache
          setCachedPosts(combinedPosts);
          return combinedPosts;
        } else {
          console.error('Failed to fetch posts from API:', response.status);
          throw new Error(`API returned ${response.status}`);
        }
      } catch (error) {
        console.error('Error fetching posts:', error);
        throw error;
      }
    },
    {
      // Only force refresh when user explicitly refreshes or clicks on logo
      forceRefresh: wasRefreshed,
      // Use cached posts if available and not forcing refresh
      enabled: !cachedPosts || wasRefreshed
    }
  )

  useEffect(() => {
    setMounted(true)
    
    // Fetch current user data for profile picture
    const fetchCurrentUser = async () => {
      if (session?.user?.email) {
        try {
          const response = await fetch('/api/users/me')
          if (response.ok) {
            const data = await response.json()
            setCurrentUser(data.user)
          }
        } catch (error) {
          console.error('Error fetching current user:', error)
        }
      }
    }

    fetchCurrentUser()
    
    // Add auto-refresh when page gets focus
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Clear cache and refetch posts when the page becomes visible again
        localStorage.removeItem('voiceflow-home-posts')
        refetch()
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    // Auto-refresh once on page load
    localStorage.removeItem('voiceflow-home-posts')
    refetch()
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [session])

  if (status === 'loading' || !mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }
  
  // Use posts from cache or from fresh fetch
  const posts = cachedPosts || fetchedPosts || []
  const loading = isLoading && !posts.length

  return (
    <Layout>
      <div className="flex gap-6 max-w-6xl mx-auto px-4">
        {/* Main Content */}
        <div className="flex-1 max-w-2xl bg-background text-foreground min-h-screen">
          <div className="sticky top-0 bg-background/90 backdrop-blur-md border-b border-border p-4 z-10 flex items-center justify-between">
            <h1 className="text-xl font-bold text-foreground">For you</h1>
            <RefreshButton onRefresh={refetch} />
          </div>
          
          {/* Create Post Section */}
          {session && (
            <div className="border-b border-border p-4">
              <CreatePostModal
                trigger={
                  <div className="flex gap-3 cursor-pointer w-full">
                    <Avatar className="w-10 h-10 ring-1 ring-border">
                      <AvatarImage src={currentUser?.image || session.user?.image || '/placeholder.svg'} alt="Your avatar" />
                      <AvatarFallback className="bg-muted text-foreground">
                        {currentUser?.name || session.user?.name ? (currentUser?.name || session.user?.name)[0].toUpperCase() : '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <input 
                        type="text"
                        placeholder="What's new?"
                        className="w-full bg-transparent text-foreground placeholder-muted-foreground text-xl outline-none cursor-pointer"
                        readOnly
                      />
                      <div className="flex justify-end mt-3">
                        <button className="bg-primary text-primary-foreground px-6 py-2 rounded-full font-medium hover:bg-primary/90 transition-colors">
                          Post
                        </button>
                      </div>
                    </div>
                  </div>
                }
                onPostCreated={() => {
                  // Refresh the posts when a new post is created
                  refetch();
                }}
              />
            </div>
          )}
          
          {/* Posts Feed */}
          <div>
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto"></div>
                <p className="mt-2 text-muted-foreground">Loading posts...</p>
              </div>
            ) : posts && posts.length > 0 ? (
              posts.map((post: any) => (
                <PostCard 
                  key={post._id || post.id} 
                  id={post._id || post.id}
                  user={post.user}
                  content={post.content}
                  timestamp={post.createdAt || post.timestamp}
                  likes={post.likesCount || post.likes || 0}
                  replies={post.commentsCount || post.replies || 0}
                  reposts={post.repostsCount || post.reposts || 0}
                  image={post.image}
                  isLiked={post.isLiked || false}
                  isReposted={post.isReposted || false}
                />
              ))
            ) : (
              <div className="p-8 text-center">
                <p className="text-muted-foreground">No posts yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar - for Desktop/Tablet */}
        <div className="hidden md:block w-80 bg-background min-h-screen">
          <div className="sticky top-4 p-4">
            <div className="bg-card rounded-lg shadow-sm p-4 mb-4">
              <h2 className="font-semibold mb-2">Welcome to Voiceflow</h2>
              <p className="text-sm text-muted-foreground">Share your thoughts with the world</p>
            </div>
            
            <div className="bg-card rounded-lg shadow-sm p-4">
              <h2 className="font-semibold mb-4">Trending topics</h2>
              {[
                "Software Development",
                "Technology",
                "AI",
                "Design",
                "UX"
              ].map((topic) => (
                <div key={topic} className="mb-3">
                  <p className="font-medium">{topic}</p>
                  <p className="text-xs text-muted-foreground">Trending with 1k+ posts</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
