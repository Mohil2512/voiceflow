import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/config'
import { getDatabases } from '@/lib/database/mongodb'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { targetUsername, action } = body

    if (!targetUsername || !action) {
      return NextResponse.json(
        { error: 'Target username and action are required' },
        { status: 400 }
      )
    }

    if (action !== 'follow' && action !== 'unfollow') {
      return NextResponse.json(
        { error: 'Action must be either "follow" or "unfollow"' },
        { status: 400 }
      )
    }

    const { profiles } = await getDatabases()
    const usersCollection = profiles.collection('users')

    // Find the target user by username
    const targetUser = await usersCollection.findOne({
      username: { $regex: new RegExp(`^${targetUsername}$`, 'i') }
    })

    if (!targetUser) {
      return NextResponse.json(
        { error: 'Target user not found' },
        { status: 404 }
      )
    }

    // Can't follow yourself
    if (session.user.email === targetUser.email) {
      return NextResponse.json(
        { error: 'Cannot follow yourself' },
        { status: 400 }
      )
    }

    const currentUserEmail = session.user.email
    const targetUserEmail = targetUser.email

    if (action === 'follow') {
      // Add target to current user's following list
      await usersCollection.updateOne(
        { email: currentUserEmail },
        { $addToSet: { following: targetUserEmail } }
      )

      // Add current user to target's followers list
      await usersCollection.updateOne(
        { email: targetUserEmail },
        { $addToSet: { followers: currentUserEmail } }
      )
    } else {
      // Remove target from current user's following list
      await usersCollection.updateOne(
        { email: currentUserEmail },
        { $pull: { following: targetUserEmail } } as any
      )

      // Remove current user from target's followers list
      await usersCollection.updateOne(
        { email: targetUserEmail },
        { $pull: { followers: currentUserEmail } } as any
      )
    }

    // Get updated follower/following counts
    const updatedTargetUser = await usersCollection.findOne({
      email: targetUserEmail
    })

    const followers = Array.isArray(updatedTargetUser?.followers) 
      ? updatedTargetUser.followers.length 
      : 0
    
    const following = Array.isArray(updatedTargetUser?.following) 
      ? updatedTargetUser.following.length 
      : 0

    return NextResponse.json({
      success: true,
      isFollowing: action === 'follow',
      stats: {
        followers,
        following
      }
    })
  } catch (error) {
    console.error('Error updating follow status:', error)
    return NextResponse.json(
      { error: 'Failed to update follow status' },
      { status: 500 }
    )
  }
}