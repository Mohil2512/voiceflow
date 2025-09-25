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

export async function POST(request: NextRequest) {
  try {
    // Get session from the request
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { targetUsername, action } = await request.json()
    
    if (!targetUsername) {
      return NextResponse.json({ error: 'Target username is required' }, { status: 400 })
    }
    
    if (action !== 'follow' && action !== 'unfollow') {
      return NextResponse.json({ error: 'Invalid action. Must be "follow" or "unfollow"' }, { status: 400 })
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
    
    // Prevent self-follow
    if (targetUser.email === currentUser.email) {
      return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 })
    }
    
    const currentUserId = currentUser._id.toString()
    const targetUserId = targetUser._id.toString()
    
    // Get or create follow records for both users
    const currentUserFollowing = await profiles.collection('following').findOne({ userId: currentUserId }) || { userId: currentUserId, following: [] }
    const targetUserFollowers = await profiles.collection('followers').findOne({ userId: targetUserId }) || { userId: targetUserId, followers: [] }
    
    if (action === 'follow') {
      // Add target to current user's following if not already there
      if (!currentUserFollowing.following.includes(targetUserId)) {
        await profiles.collection('following').updateOne(
          { userId: currentUserId },
          { 
            $set: { updatedAt: new Date() },
            $addToSet: { following: targetUserId } 
          },
          { upsert: true }
        )
        
        // Add current user to target user's followers
        await profiles.collection('followers').updateOne(
          { userId: targetUserId },
          { 
            $set: { updatedAt: new Date() },
            $addToSet: { followers: currentUserId } 
          },
          { upsert: true }
        )
        
        // Create follow notification
        await profiles.collection('notifications').insertOne({
          userId: targetUserId,
          type: 'new_follower',
          fromUser: {
            id: currentUserId,
            name: currentUser.name,
            username: currentUser.username,
            avatar: currentUser.image
          },
          read: false,
          createdAt: new Date()
        })
        
        return NextResponse.json({ success: true, action: 'follow', isFollowing: true })
      } else {
        // Already following
        return NextResponse.json({ success: true, action: 'follow', isFollowing: true, message: 'Already following this user' })
      }
    } else {
      // Unfollow logic
      await profiles.collection('following').updateOne(
        { userId: currentUserId },
        { $pull: { following: targetUserId } }
      )
      
      await profiles.collection('followers').updateOne(
        { userId: targetUserId },
        { $pull: { followers: currentUserId } }
      )
      
      return NextResponse.json({ success: true, action: 'unfollow', isFollowing: false })
    }
  } catch (error) {
    console.error('Error in follow/unfollow operation:', error)
    return NextResponse.json(
      { 
        error: 'Failed to process follow/unfollow request',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}