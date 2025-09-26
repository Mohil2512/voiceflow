import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

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

// Import database functions
const getDatabases = async () => {
  try {
    const { getDatabases: getDB } = await import('@/lib/database/mongodb')
    return await getDB();
  } catch (error) {
    console.error('Database connection error:', error);
    throw new Error('Failed to connect to MongoDB Atlas: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get session from the request
    const session = await getServerSession()
    
    if (!session?.user?.email) {
      console.error('Authentication failed: No valid session')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const databases = await getDatabases()
    
    // Get user data from database
    const userData = await databases.auth.collection('users').findOne({ 
      email: session.user.email 
    })
    
    console.log('Raw user data from database:', userData)
    
    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    // Also get user's posts in the same request for better performance
    const userPosts = await databases.activities.collection('posts').find({
      'author.email': session.user.email
    })
    .sort({ createdAt: -1 })
    .limit(20)
    .toArray()
    
    // Format posts with current user data
    const formattedPosts = userPosts.map(post => ({
      id: post._id.toString(),
      user: {
        name: userData.name,
        username: userData.username,
        avatar: userData.image,
        verified: userData.verified || false,
        email: userData.email,
      },
      content: post.content || '',
      timestamp: formatTimestamp(post.createdAt),
      likes: post.likes || 0,
      replies: post.replies || 0,
      reposts: post.reposts || 0,
      image: post.images && post.images.length > 0 
        ? `data:${post.images[0].type};base64,${post.images[0].data}` 
        : null,
    }))
    
    // Return user data with posts in single response
    return NextResponse.json({
      success: true,
      user: {
        name: userData.name,
        username: userData.username,
        email: userData.email,
        bio: userData.bio,
        image: userData.image,
        createdAt: userData.createdAt,
        updatedAt: userData.updatedAt
      },
      posts: formattedPosts
    })
    
  } catch (error) {
    console.error('Error fetching user profile:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}