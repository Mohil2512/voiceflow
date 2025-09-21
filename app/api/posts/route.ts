import { NextRequest, NextResponse } from 'next/server'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

// Conditional import of database functions
const getDatabases = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error('Database not available')
  }
  const { getDatabases: getDB } = await import('@/lib/database/mongodb')
  return getDB()
}

function formatTimestamp(date: Date | string): string {
  if (!date) return 'now'
  
  const now = new Date()
  const postDate = new Date(date)
  const diffInMs = now.getTime() - postDate.getTime()
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
  const diffInDays = Math.floor(diffInHours / 24)
  
  if (diffInHours < 1) return 'now'
  if (diffInHours < 24) return `${diffInHours}h`
  if (diffInDays < 7) return `${diffInDays}d`
  return postDate.toLocaleDateString()
}

// Mock data for when database is unavailable
const getMockPosts = () => [
  {
    id: 'mock-1',
    user: {
      name: 'Demo User',
      email: 'demo@example.com',
      image: '/placeholder.svg'
    },
    content: 'Welcome to Voiceflow! This is a demo post while the database is initializing.',
    timestamp: formatTimestamp(new Date()),
    likes: 0,
    comments: 0
  }
]

export async function GET(request: NextRequest) {
  try {
    // Try to connect to database
    const { activities } = await getDatabases()
    
    // Get posts from database, sorted by creation date (newest first)
    const posts = await activities.collection('posts').find({})
      .sort({ createdAt: -1 })
      .limit(20) // Limit to 20 posts for performance
      .toArray()
    
    // Transform posts to match frontend format
    const formattedPosts = posts.map(post => ({
      id: post._id.toString(),
      user: {
        name: post.author?.name || 'Anonymous',
        username: post.author?.username || 'anonymous',
        avatar: post.author?.avatar || '/placeholder.svg',
        verified: post.author?.verified || false,
      },
      content: post.content || '',
      timestamp: formatTimestamp(post.createdAt),
      likes: post.likes || 0,
      replies: post.replies || 0,
      reposts: post.reposts || 0,
      image: post.image || null,
    }))
    
    return NextResponse.json({ posts: formattedPosts })
  } catch (error) {
    console.error('Error fetching posts:', error)
    
    // Return mock data when database is not available
    // This allows the app to function even without database connection
    return NextResponse.json(
      { 
        posts: getMockPosts(),
        message: 'Using demo data - database temporarily unavailable.'
      },
      { status: 200 } // Return 200 instead of 500 to avoid frontend errors
    )
  }
}