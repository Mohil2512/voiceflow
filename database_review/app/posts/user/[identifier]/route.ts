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
  
  try {
    const now = new Date()
    const postDate = new Date(date)
    
    // Check if the date is valid
    if (isNaN(postDate.getTime())) {
      return 'now'
    }
    
    const diffInMs = now.getTime() - postDate.getTime()
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
    const diffInDays = Math.floor(diffInHours / 24)
    
    if (diffInHours < 1) return 'now'
    if (diffInHours < 24) return `${diffInHours}h`
    if (diffInDays < 7) return `${diffInDays}d`
    return postDate.toLocaleDateString()
  } catch (error) {
    console.error('Error formatting timestamp:', error)
    return 'now'
  }
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
    const { profiles } = await getDatabases()
    
    // Try to determine if this is a username or email
    const isEmail = identifier.includes('@')
    
    let query = {}
    
    if (isEmail) {
      // Direct search by email
      query = { 'author.email': identifier }
    } else {
      // Search by username in author field
      query = { 'author.email': { $regex: new RegExp(`${identifier}@`, 'i') } }
    }
    
    console.log('🔍 Searching for posts with query:', query)
    
    // Get posts from database, sorted by creation date (newest first)
    const posts = await profiles.collection('posts').find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray()
      
    console.log(`📊 Found ${posts.length} posts for user ${identifier}`)
    
    // Get current user profile to get the latest username
    const usersCollection = profiles.collection('users')
    const userProfile = await usersCollection.findOne({ email: identifier })
    
    console.log(`🔍 User profile for ${identifier}:`, {
      hasProfile: !!userProfile,
      profileName: userProfile?.name,
      profileUsername: userProfile?.username,
      profileImage: userProfile?.image,
      profileAvatar: userProfile?.avatar
    })
    
    // Transform posts to match frontend format
    const formattedPosts = posts.map((post) => {
      console.log(`🔍 Post author data:`, {
        authorName: post.author?.name,
        authorEmail: post.author?.email,
        authorImage: post.author?.image,
        finalAvatar: userProfile?.image || post.author?.image || '/placeholder.svg'
      })
      
      return {
        id: post._id.toString(),
        user: {
          name: userProfile?.name || post.author?.name || 'Anonymous',
          username: userProfile?.username || post.author?.email?.split('@')[0] || 'anonymous',
          avatar: userProfile?.image || post.author?.image || '/placeholder.svg',
          verified: false,
          email: post.author?.email,
        },
        content: post.content || '',
        timestamp: formatTimestamp(post.createdAt),
        likes: post.likes || 0,
        replies: post.replies || 0,
        reposts: post.reposts || 0,
        image: post.images && post.images.length > 0 ? post.images[0] : null,
        images: post.images || [],
      }
    })
    
    console.log('📝 Formatted posts:', formattedPosts.length)
    
    return NextResponse.json(formattedPosts)
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