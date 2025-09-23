import { NextRequest, NextResponse } from 'next/server'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

// Import database functions
const getDatabases = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error('MongoDB URI environment variable is not set')
  }
  try {
    const { getDatabases: getDB } = await import('@/lib/database/mongodb')
    return await getDB()
  } catch (error) {
    console.error('Database connection error:', error)
    throw new Error('Failed to connect to MongoDB Atlas: ' + (error instanceof Error ? error.message : 'Unknown error'))
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

export async function GET(request: NextRequest) {
  try {
    // Connect to database - MongoDB Atlas
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
        username: post.author?.email?.split('@')[0] || 'anonymous', // Use email prefix as username
        avatar: post.author?.image || '/placeholder.svg',
        verified: post.author?.verified || false,
      },
      content: post.content || '',
      timestamp: formatTimestamp(post.createdAt),
      likes: post.likes || 0,
      replies: post.replies || 0,
      reposts: post.reposts || 0,
      // Use the first image from the images array if available
      image: post.images && post.images.length > 0 
        ? `data:${post.images[0].type};base64,${post.images[0].data}` 
        : null,
    }))
    
    return NextResponse.json({ posts: formattedPosts })
  } catch (error) {
    console.error('Error fetching posts from MongoDB Atlas:', error)
    
    // Return proper error status with detailed error message
    return NextResponse.json(
      { 
        error: 'Failed to fetch posts from MongoDB Atlas',
        message: error instanceof Error ? error.message : 'Unknown database error'
      },
      { status: 500 }
    )
  }
}