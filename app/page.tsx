"use client"

import { useSession } from 'next-auth/react'
import { PostCard } from "@/components/post/PostCard"
import { Layout } from "@/components/layout/Layout"
import { CreatePostModal } from "@/components/post/CreatePostModal"
import { useEffect, useState, useMemo, useCallback } from 'react'
import { useAppData } from '@/providers/data-provider'
import { RefreshButton } from '@/components/ui/refresh-button'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"

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
  [key: string]: any;
}

export default function HomePage() {
  const { data: session, status } = useSession()
  const { toast } = useToast()
  const [mounted, setMounted] = useState(false)
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const { posts: cachedPosts, setPosts: setCachedPosts, wasRefreshed } = useAppData()
  
  const fetchPosts = useCallback(async () => {
    console.log('fetchPosts called')
    
    try {
      setIsLoading(true)
      console.log('Making API call to /api/posts')
      const response = await fetch('/api/posts?timestamp=' + new Date().getTime());
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Fetched posts:', data.length || 0, 'posts');
      
      setPosts(data);
      return data;
    } catch (error) {
      console.error('Error fetching posts:', error);
      return [];
    } finally {
      setIsLoading(false)
    }
  }, []) // No dependencies - using only local state

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted) {
      console.log('HomePage useEffect: calling fetchPosts')
      fetchPosts()
    }
  }, [mounted, fetchPosts])

  const displayedPosts = useMemo(() => {
    return posts.slice().sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }, [posts])

  const loading = isLoading && posts.length === 0

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
  const postsToDisplay = cachedPosts || posts || []

  if (!mounted) {
    return null
  }

  return (
    <Layout>
      <div className="flex gap-6 max-w-6xl mx-auto px-4 md:px-6">
        {/* Main Content */}
        <div className="flex-1 max-w-2xl bg-background text-foreground min-h-screen w-full">
          <div className="sticky top-0 bg-background/90 backdrop-blur-md border-b border-border p-3 md:p-4 z-10 flex items-center justify-between">
            <h1 className="text-lg md:text-xl font-bold text-foreground">For you</h1>
            <RefreshButton onRefresh={fetchPosts} />
          </div>

          {/* Create Post Section */}
          {session && (
            <div className="border-b border-border p-3 md:p-4">
              <CreatePostModal
                trigger={
                  <div className="flex gap-3 cursor-pointer w-full">
                    <Avatar className="w-10 h-10 ring-1 ring-border flex-shrink-0">
                      <AvatarImage src={session.user?.image || '/placeholder.svg'} alt="Your avatar" />
                      <AvatarFallback className="bg-muted text-foreground">
                        {session.user?.name ? session.user.name[0].toUpperCase() : '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <input
                        type="text"
                        placeholder="What's new?"
                        className="w-full bg-transparent text-foreground placeholder-muted-foreground text-lg md:text-xl outline-none cursor-pointer"
                        readOnly
                      />
                      <div className="flex justify-end mt-3">
                        <button className="bg-primary text-primary-foreground px-4 py-2 md:px-6 md:py-2 rounded-full font-medium hover:bg-primary/90 transition-colors text-sm md:text-base">
                          Post
                        </button>
                      </div>
                    </div>
                  </div>
                }
                onPostCreated={() => {
                  fetchPosts();
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
            ) : displayedPosts.length > 0 ? (
              displayedPosts.map((post) => (
                <PostCard
                  key={post.id}
                  id={post.id}
                  user={post.user}
                  content={post.content}
                  timestamp={post.timestamp}
                  likes={post.likes || 0}
                  replies={post.replies || 0}
                  reposts={post.reposts || 0}
                  image={post.image}
                  images={post.images || []}
                  isLiked={post.isLiked || false}
                  isReposted={post.isReposted || false}
                  onPostUpdate={fetchPosts}
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
