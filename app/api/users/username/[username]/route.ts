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

    const { auth, profiles } = await getDatabases()
    const usersCollection = auth.collection('user')
    const postsCollection = profiles.collection('posts')

    // Try to find user by username (case-insensitive)
    const user = await usersCollection.findOne({
      username: { $regex: new RegExp(`^${username}$`, 'i') }
    })

    if (user) {
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
    }

    // User not found in users collection, check if posts exist from this username
    console.log('⚠️ User not in users table, checking posts...')
    const post = await postsCollection.findOne({
      'author.username': { $regex: new RegExp(`^${username}$`, 'i') }
    })

    if (post && post.author) {
      console.log('✅ Found posts from deleted user, creating ghost profile')
      // Return ghost user profile based on post author data
      return NextResponse.json({
        user: {
          id: 'deleted',
          name: post.author.name || 'Deleted User',
          username: post.author.username || username,
          email: post.author.email || null,
          avatar: post.author.image || null,
          image: post.author.image || null,
          verified: false,
          bio: 'This user account has been deleted or is no longer available.',
          location: null,
          website: null,
          createdAt: post.createdAt || new Date(),
          followers: 0,
          following: 0
        }
      })
    }

    console.log('❌ No user or posts found for:', username)
    return NextResponse.json(
      { error: 'User not found' },
      { status: 404 }
    )
  } catch (error) {
    console.error('Error fetching user by username:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    )
  }
}