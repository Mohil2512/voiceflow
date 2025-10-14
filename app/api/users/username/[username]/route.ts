import { NextRequest, NextResponse } from 'next/server'
import { getDatabases } from '@/lib/database/mongodb'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    const username = params.username
    
    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      )
    }

    console.log('🔍 Looking up user by username:', username)

    const { profiles } = await getDatabases()
    const usersCollection = profiles.collection('users')

    // Try to find user by username (case-insensitive)
    const user = await usersCollection.findOne({
      username: { $regex: new RegExp(`^${username}$`, 'i') }
    })

    if (!user) {
      console.log('❌ User not found:', username)
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    console.log('✅ User found:', user.username)

    // Return user data
    return NextResponse.json({
      user: {
        id: user._id.toString(),
        name: user.name || null,
        username: user.username || null,
        email: user.email || null,
        avatar: user.image || null,
        image: user.image || null,
        verified: user.isVerified || false,
        bio: user.bio || null,
        location: user.location || null,
        website: user.website || null,
        createdAt: user.createdAt || new Date(),
        followers: user.followers || 0,
        following: user.following || 0
      }
    })
  } catch (error) {
    console.error('Error fetching user by username:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    )
  }
}