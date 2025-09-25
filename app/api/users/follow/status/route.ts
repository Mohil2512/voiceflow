import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'

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

const authOptions = {
  // We'll get the session directly from the request headers
  secret: process.env.NEXTAUTH_SECRET,
}

export async function GET(request: NextRequest) {
  try {
    // Get session from the request
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the target username from the URL query parameter
    const targetUsername = request.nextUrl.searchParams.get('username')
    
    if (!targetUsername) {
      return NextResponse.json({ error: 'Target username is required' }, { status: 400 })
    }
    
    // Connect to database
    const { auth, profiles } = await getDatabases()
    
    // Get target user
    const targetUser = await auth.collection('users').findOne({ 
      $or: [
        { username: targetUsername },
        { username: { $regex: new RegExp(`^${targetUsername}$`, 'i') } }
      ]
    })
    
    if (!targetUser) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 })
    }
    
    // Get current user
    const currentUser = await auth.collection('users').findOne({ email: session.user.email })
    
    if (!currentUser) {
      return NextResponse.json({ error: 'Current user not found in database' }, { status: 404 })
    }
    
    // Prevent self-follow check
    if (targetUser.email === currentUser.email) {
      return NextResponse.json({ isFollowing: false, isSelf: true })
    }
    
    const currentUserId = currentUser._id.toString()
    const targetUserId = targetUser._id.toString()
    
    // Check if current user is following target user
    const currentUserFollowing = await profiles.collection('following').findOne({ userId: currentUserId })
    const isFollowing = currentUserFollowing?.following?.includes(targetUserId) || false
    
    // Get follower and following counts for target user
    const targetUserFollowers = await profiles.collection('followers').findOne({ userId: targetUserId })
    const followerCount = targetUserFollowers?.followers?.length || 0
    
    const targetUserFollowing = await profiles.collection('following').findOne({ userId: targetUserId })
    const followingCount = targetUserFollowing?.following?.length || 0
    
    return NextResponse.json({ 
      isFollowing,
      isSelf: false,
      stats: {
        followers: followerCount,
        following: followingCount
      }
    })
  } catch (error) {
    console.error('Error checking follow status:', error)
    return NextResponse.json(
      { 
        error: 'Failed to check follow status',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}