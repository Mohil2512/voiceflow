import { NextRequest, NextResponse } from 'next/server'
import { getDatabases } from '@/lib/database/mongodb'

export const dynamic = 'force-dynamic'

// GET /api/users/[username]/followers - Get list of followers
export async function GET(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    const { username } = params

    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      )
    }

    const { profiles } = await getDatabases()
    const usersCollection = profiles.collection('users')

    // Find the user
    const user = await usersCollection.findOne({
      username: { $regex: new RegExp(`^${username}$`, 'i') }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Get follower emails
    const followerEmails = Array.isArray(user.followers) ? user.followers : []

    // Fetch follower user details
    const followers = await usersCollection
      .find({
        email: { $in: followerEmails }
      })
      .toArray()

    const followerList = followers.map(follower => ({
      id: follower._id.toString(),
      name: follower.name || 'Anonymous',
      username: follower.username || follower.email.split('@')[0],
      avatar: follower.image || null,
      bio: follower.bio || null
    }))

    return NextResponse.json({
      followers: followerList,
      count: followerList.length
    })
  } catch (error) {
    console.error('Error fetching followers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch followers' },
      { status: 500 }
    )
  }
}
