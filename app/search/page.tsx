"use client"

import { useState, useEffect, useCallback } from 'react'
import { Search, User, FileText } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Layout } from "@/components/layout/Layout"
import { PostCard } from '@/components/post/PostCard'

interface User {
  id: string
  name: string
  email: string
  image: string | null
  bio: string | null
  username: string
  isVerified: boolean
}

interface Post {
  _id: string
  content: string
  author: {
    name: string
    email: string
    image: string | null
    username: string
  }
  createdAt: string
  likes?: string[]
  reposts?: string[]
  images?: string[]
  isRepost?: boolean
  originalPost?: {
    content?: string
    author?: {
      name?: string
      username?: string
      image?: string | null
      email?: string
    }
  }
}

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [users, setUsers] = useState<User[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [activeTab, setActiveTab] = useState('people')
  const [isLoading, setIsLoading] = useState(false)

  const performSearch = useCallback(async (searchQuery: string) => {
    setIsLoading(true)
    try {
      // Search users and posts in parallel
      const [usersResponse, postsResponse] = await Promise.all([
        fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`),
        fetch(`/api/posts/search?q=${encodeURIComponent(searchQuery)}`)
      ])

      if (usersResponse.ok) {
        const userData = await usersResponse.json()
        setUsers(userData)
      }

      if (postsResponse.ok) {
        const postData = await postsResponse.json()
        setPosts(postData)
      }
    } catch (error) {
      console.error('Search error:', error)
      setUsers([])
      setPosts([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim()) {
        performSearch(query.trim())
      } else {
        setUsers([])
        setPosts([])
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query, performSearch])

  return (
    <Layout>
      <div className="min-h-screen bg-background text-foreground">
        {/* Search Header */}
        <div className="sticky top-0 bg-background/90 backdrop-blur-md border-b border-border px-3 md:px-4 py-4">
          <h1 className="text-lg md:text-xl font-semibold mb-4">Search</h1>
          
          {/* Search Input */}
          <div className="relative">
            <div className="flex items-center bg-muted rounded-xl px-3 md:px-4 py-3">
              <Search className="h-5 w-5 text-muted-foreground mr-3 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search for people and posts"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 bg-transparent text-foreground placeholder-muted-foreground outline-none text-sm md:text-base"
              />
            </div>
          </div>
        </div>

        {/* Search Results */}
        <div className="px-3 md:px-4 py-6">
          {query.trim() ? (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 bg-muted">
                <TabsTrigger value="people" className="flex items-center space-x-1 md:space-x-2 data-[state=active]:bg-background text-xs md:text-sm">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">People ({users.length})</span>
                  <span className="sm:hidden">({users.length})</span>
                </TabsTrigger>
                <TabsTrigger value="posts" className="flex items-center space-x-1 md:space-x-2 data-[state=active]:bg-background text-xs md:text-sm">
                  <FileText className="h-4 w-4" />
                  <span className="hidden sm:inline">Posts ({posts.length})</span>
                  <span className="sm:hidden">({posts.length})</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="people" className="mt-4">
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Searching people...</div>
                ) : users.length > 0 ? (
                  <div className="space-y-4">
                    {users.map((user) => (
                      <UserCard key={user.id} user={user} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <User className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                    <p>No people found for &ldquo;{query}&rdquo;</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="posts" className="mt-4">
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Searching posts...</div>
                ) : posts.length > 0 ? (
                  <div className="space-y-4">
                    {posts.map((post) => (
                      <PostCard 
                        key={post._id}
                        id={post._id}
                        user={{
                          name: post.author.name,
                          username: post.author.username,
                          image: post.author.image || undefined,
                          email: post.author.email
                        }}
                        content={post.content}
                        timestamp={post.createdAt}
                        likes={post.likes?.length || 0}
                        reposts={post.reposts?.length || 0}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                    <p>No posts found for &ldquo;{query}&rdquo;</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="mx-auto h-16 w-16 text-muted-foreground/50 mb-4" />
              <h2 className="text-lg md:text-xl font-semibold mb-2 text-foreground">Search for anything</h2>
              <p className="text-sm md:text-base">Find people and posts by typing in the search box above</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}

interface UserCardProps {
  user: User
}

function UserCard({ user }: UserCardProps) {
  const [isFollowed, setIsFollowed] = useState(false)

  return (
    <div className="flex items-center justify-between py-3 px-3 md:px-4 hover:bg-accent/30 rounded-lg">
      <div className="flex items-center space-x-3 flex-1 min-w-0">
        <Avatar className="h-12 w-12 flex-shrink-0">
          <AvatarImage src={user.image || ''} alt={user.name} />
          <AvatarFallback className="bg-muted text-foreground">
            {user.name?.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-1">
            <span className="font-semibold text-foreground truncate">{user.username}</span>
            {user.isVerified && (
              <div className="w-4 h-4 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-2.5 h-2.5 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </div>
          <p className="text-muted-foreground text-sm truncate">{user.name}</p>
          {user.bio && (
            <p className="text-foreground text-sm mt-1 line-clamp-2">{user.bio}</p>
          )}
        </div>
      </div>
      
      <Button
        onClick={() => setIsFollowed(!isFollowed)}
        className="ml-2 md:ml-4 px-3 md:px-6 py-1.5 text-xs md:text-sm font-semibold flex-shrink-0"
        variant={isFollowed ? "outline" : "default"}
      >
        {isFollowed ? 'Following' : 'Follow'}
      </Button>
    </div>
  )
}