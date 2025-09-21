"use client"

import { useSession } from 'next-auth/react'
import { PostCard } from "@/components/post/PostCard"
import { Layout } from "@/components/layout/Layout"
import { useEffect, useState } from 'react'

export default function HomePage() {
  const { data: session, status } = useSession()
  const [mounted, setMounted] = useState(false)
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    // Fetch posts from database
    const fetchPosts = async () => {
      try {
        const response = await fetch('/api/posts')
        if (response.ok) {
          const data = await response.json()
          setPosts(data.posts || [])
        }
      } catch (error) {
        console.error('Error fetching posts:', error)
        setPosts([]) // Show empty state on error
      } finally {
        setLoading(false)
      }
    }

    if (mounted) {
      fetchPosts()
    }
  }, [mounted])

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

  return (
    <Layout>
      <div className="flex gap-6 max-w-6xl mx-auto px-4">
        {/* Main Content */}
        <div className="flex-1 max-w-2xl bg-background text-foreground min-h-screen">
          <div className="sticky top-0 bg-background/90 backdrop-blur-md border-b border-border p-4 z-10">
            <h1 className="text-xl font-bold text-foreground">For you</h1>
          </div>
          
          {/* Create Post Section */}
          {session && (
            <div className="border-b border-border p-4">
              <div className="flex gap-3">
                <img 
                  src={session.user?.image || '/placeholder.svg'} 
                  alt="Your avatar"
                  className="w-10 h-10 rounded-full"
                />
                <div className="flex-1">
                  <input 
                    type="text"
                    placeholder="What's new?"
                    className="w-full bg-transparent text-foreground placeholder-muted-foreground text-xl outline-none"
                  />
                  <div className="flex justify-end mt-3">
                    <button className="bg-primary text-primary-foreground px-6 py-2 rounded-full font-medium hover:bg-primary/90 transition-colors">
                      Post
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-foreground"></div>
              <p className="ml-2 text-muted-foreground">Loading posts...</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-16">
              <h2 className="text-2xl font-bold text-muted-foreground mb-2">No posts yet</h2>
              <p className="text-muted-foreground">Be the first to share something!</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {posts.map((post) => (
                <div key={post.id} className="p-4">
                  <PostCard {...post} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="w-80 hidden lg:block">
          <div className="sticky top-4 space-y-4">
            {!session && (
              <div className="bg-card border border-border rounded-xl p-6">
                <h2 className="text-xl font-bold text-foreground mb-2">New to Voiceflow?</h2>
                <p className="text-muted-foreground mb-4 text-sm">
                  Join today to connect with people and share your thoughts.
                </p>
                <div className="space-y-3">
                  <button 
                    onClick={() => window.location.href = '/auth/signin'}
                    className="w-full bg-primary text-primary-foreground py-2 px-4 rounded-full font-medium hover:bg-primary/90 transition-colors"
                  >
                    Create account
                  </button>
                  <button 
                    onClick={() => window.location.href = '/auth/signin'}
                    className="w-full border border-border text-foreground py-2 px-4 rounded-full font-medium hover:bg-accent transition-colors"
                  >
                    Sign in
                  </button>
                </div>
              </div>
            )}
            
            {/* Trending or other cards can go here */}
            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="text-lg font-bold text-foreground mb-3">What's happening</h3>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Welcome to Voiceflow - a place to connect and share ideas!</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}