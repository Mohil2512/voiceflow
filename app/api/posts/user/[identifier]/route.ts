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

export async function GET(
  request: NextRequest,
  { params }: { params: { identifier: string } }
) {
  const identifier = params.identifier
  
  if (!identifier) {
    return NextResponse.json(
      { error: 'User identifier parameter is required' },
      { status: 400 }
    )
  }
  
  try {
    // Connect to database - MongoDB Atlas
    const { activities, auth } = await getDatabases()
    
    // Try to determine if this is a username or email
    const isEmail = identifier.includes('@')
    
    let query = {}
    
    if (isEmail) {
      // Direct search by email
      query = { 'author.email': identifier }
    } else {
      // First try to find the user by username to get email
      const user = await auth.collection('users').findOne({ 
        $or: [
          { username: identifier },
          { username: { $regex: new RegExp(`^${identifier}$`, 'i') } }
        ]
      })
      
      if (user) {
        // Use the email from the found user
        query = { 'author.email': user.email }
      } else {
        // Fallback to direct username search
        query = { 'author.username': identifier }
      }
    }
    
    // Get posts from database, sorted by creation date (newest first)
    const posts = await activities.collection('posts').find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray()
    
    // Transform posts to match frontend format
    const formattedPosts = posts.map(post => ({
      id: post._id.toString(),
      user: {
        name: post.author?.name || 'Anonymous',
        username: post.author?.username || post.author?.email?.split('@')[0] || 'anonymous',
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
    console.error('Error fetching user posts from MongoDB Atlas:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch user posts',
        message: error instanceof Error ? error.message : 'Unknown database error'
      },
      { status: 500 }
    )
  }
}