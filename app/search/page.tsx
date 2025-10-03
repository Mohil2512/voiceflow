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
  likes: string[]
  reposts: string[]
  isRepost?: boolean
  originalPost?: any
}

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [users, setUsers] = useState<User[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [activeTab, setActiveTab] = useState('people')
  const [isLoading, setIsLoading] = useState(false)

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
  }, [query])

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

  return (
    <Layout>
      <div className="min-h-screen bg-black text-white">
        {/* Search Header */}
        <div className="sticky top-0 bg-black border-b border-gray-800 px-4 py-4">
          <h1 className="text-xl font-semibold mb-4">Search</h1>
          
          {/* Search Input */}
          <div className="relative">
            <div className="flex items-center bg-gray-900 rounded-xl px-4 py-3">
              <Search className="h-5 w-5 text-gray-400 mr-3" />
              <input
                type="text"
                placeholder="Search for people and posts"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 bg-transparent text-white placeholder-gray-400 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Search Results */}
        <div className="px-4 py-6">
          {query.trim() ? (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 bg-gray-900">
                <TabsTrigger value="people" className="flex items-center space-x-2 data-[state=active]:bg-gray-700">
                  <User className="h-4 w-4" />
                  <span>People ({users.length})</span>
                </TabsTrigger>
                <TabsTrigger value="posts" className="flex items-center space-x-2 data-[state=active]:bg-gray-700">
                  <FileText className="h-4 w-4" />
                  <span>Posts ({posts.length})</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="people" className="mt-4">
                {isLoading ? (
                  <div className="text-center py-8 text-gray-400">Searching people...</div>
                ) : users.length > 0 ? (
                  <div className="space-y-4">
                    {users.map((user) => (
                      <UserCard key={user.id} user={user} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-400">
                    <User className="mx-auto h-12 w-12 text-gray-600 mb-4" />
                    <p>No people found for "{query}"</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="posts" className="mt-4">
                {isLoading ? (
                  <div className="text-center py-8 text-gray-400">Searching posts...</div>
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
                  <div className="text-center py-12 text-gray-400">
                    <FileText className="mx-auto h-12 w-12 text-gray-600 mb-4" />
                    <p>No posts found for "{query}"</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Search className="mx-auto h-16 w-16 text-gray-600 mb-4" />
              <h2 className="text-xl font-semibold mb-2">Search for anything</h2>
              <p>Find people and posts by typing in the search box above</p>
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
    <div className="flex items-center justify-between py-3 px-4 hover:bg-gray-900 rounded-lg">
      <div className="flex items-center space-x-3 flex-1">
        <Avatar className="h-12 w-12">
          <AvatarImage src={user.image || ''} alt={user.name} />
          <AvatarFallback className="bg-gray-700 text-white">
            {user.name?.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-1">
            <span className="font-semibold text-white truncate">{user.username}</span>
            {user.isVerified && (
              <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </div>
          <p className="text-gray-400 text-sm truncate">{user.name}</p>
          {user.bio && (
            <p className="text-gray-300 text-sm mt-1 line-clamp-2">{user.bio}</p>
          )}
        </div>
      </div>
      
      <Button
        onClick={() => setIsFollowed(!isFollowed)}
        className={`ml-4 px-6 py-1.5 rounded-lg text-sm font-semibold ${
          isFollowed
            ? 'bg-gray-800 text-white border border-gray-600 hover:bg-gray-700'
            : 'bg-white text-black hover:bg-gray-100'
        }`}
        variant="ghost"
      >
        {isFollowed ? 'Following' : 'Follow'}
      </Button>
    </div>
  )
}