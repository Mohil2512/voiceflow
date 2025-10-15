import { NextRequest, NextResponse } from 'next/server'
import { getDatabases } from '@/lib/database/mongodb'

export const dynamic = 'force-dynamic'

// GET /api/users/[identifier]/following - Get list of users this user follows
export async function GET(
  request: NextRequest,
  { params }: { params: { identifier: string } }
) {
  try {
    const { identifier } = params

    if (!identifier) {
      return NextResponse.json(
        { error: 'Identifier is required' },
        { status: 400 }
      )
    }

    const { profiles } = await getDatabases()
    const usersCollection = profiles.collection('users')

    // Find the user by username or email
    const user = await usersCollection.findOne({
      $or: [
        { username: { $regex: new RegExp(`^${identifier}$`, 'i') } },
        { email: identifier }
      ]
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Get following emails
    const followingEmails = Array.isArray(user.following) ? user.following : []

    // Fetch following user details
    const following = await usersCollection
      .find({
        email: { $in: followingEmails }
      })
      .toArray()

    const followingList = following.map(followedUser => ({
      id: followedUser._id.toString(),
      name: followedUser.name || 'Anonymous',
      username: followedUser.username || followedUser.email.split('@')[0],
      avatar: followedUser.image || null,
      bio: followedUser.bio || null
    }))

    return NextResponse.json({
      following: followingList,
      count: followingList.length
    })
  } catch (error) {
    console.error('Error fetching following:', error)
    return NextResponse.json(
      { error: 'Failed to fetch following list' },
      { status: 500 }
    )
  }
}
