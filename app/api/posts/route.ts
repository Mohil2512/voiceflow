import { NextRequest, NextResponse } from 'next/server'
import { getDatabases } from '@/lib/database/mongodb'

export async function GET(request: NextRequest) {
  try {
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
    
    // For now, return empty array when database is not available
    // This allows the app to function even without database connection
    return NextResponse.json(
      { 
        posts: [],
        message: 'Database temporarily unavailable. Please try again later.'
      },
      { status: 200 } // Return 200 instead of 500 to avoid frontend errors
    )
  }
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