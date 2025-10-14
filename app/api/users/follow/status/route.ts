import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../auth/[...nextauth]/config'
import { getDatabases } from '@/lib/database/mongodb'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const username = searchParams.get('username')

    if (!username) {
      return NextResponse.json(
        { error: 'Username parameter is required' },
        { status: 400 }
      )
    }

    const { profiles } = await getDatabases()
    const usersCollection = profiles.collection('users')

    // Find the target user by username
    const targetUser = await usersCollection.findOne({
      username: { $regex: new RegExp(`^${username}$`, 'i') }
    })

    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if viewing own profile
    const isSelf = session.user.email === targetUser.email

    // Check if current user is following the target user
    const currentUser = await usersCollection.findOne({
      email: session.user.email
    })

    const followingList = Array.isArray(currentUser?.following) 
      ? currentUser.following 
      : []
    
    const isFollowing = followingList.includes(targetUser.email)

    // Get follower and following counts
    const followers = Array.isArray(targetUser.followers) 
      ? targetUser.followers.length 
      : (targetUser.followers || 0)
    
    const following = Array.isArray(targetUser.following) 
      ? targetUser.following.length 
      : (targetUser.following || 0)

    return NextResponse.json({
      isFollowing,
      isSelf,
      stats: {
        followers,
        following
      }
    })
  } catch (error) {
    console.error('Error checking follow status:', error)
    return NextResponse.json(
      { error: 'Failed to check follow status' },
      { status: 500 }
    )
  }
}