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
    
    // Try auth database first
    const authUsersCollection = auth.collection('user')
    let user = await authUsersCollection.findOne({
      username: { $regex: new RegExp(`^${username}$`, 'i') }
    })

    // If not found in auth, try profiles database
    if (!user) {
      const profilesUsersCollection = profiles.collection('users')
      user = await profilesUsersCollection.findOne({
        username: { $regex: new RegExp(`^${username}$`, 'i') }
      })
    }

    if (user) {
      console.log('✅ User found:', user.username || user.email)
      // Return user data
      return NextResponse.json({
        user: {
          id: user._id.toString(),
          name: user.name || null,
          username: user.username || (user.email ? user.email.split('@')[0] : null),
          email: user.email || null,
          avatar: user.image || user.avatar || null,
          image: user.image || user.avatar || null,
          verified: user.isVerified || false,
          bio: user.bio || null,
          location: user.location || null,
          website: user.website || null,
          createdAt: user.createdAt || new Date(),
          followers: Array.isArray(user.followers) ? user.followers.length : (user.followers || 0),
          following: Array.isArray(user.following) ? user.following.length : (user.following || 0)
        }
      })
    }

    // User not found in users collection, check if posts exist from this username or name
    console.log('⚠️ User not in users table, checking posts...')
    const postsCollection = profiles.collection('posts')
    let post = await postsCollection.findOne({
      'author.username': { $regex: new RegExp(`^${username}$`, 'i') }
    })

    // If still not found, try searching by author name (for users without username like dhaneshvaghasiya)
    if (!post) {
      // Convert username format like "dhaneshvaghasiya" to "Dhanesh Vaghasiya" pattern
      const namePattern = username.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/([a-z]+)/gi, (match) => {
        return match.charAt(0).toUpperCase() + match.slice(1).toLowerCase()
      })
      
      post = await postsCollection.findOne({
        $or: [
          { 'author.name': { $regex: new RegExp(namePattern, 'i') } },
          { 'author.email': { $regex: new RegExp(`^${username}`, 'i') } }
        ]
      })
    }

    if (post && post.author) {
      console.log('✅ Found posts from user without username, creating profile from post data')
      // Return user profile based on post author data
      return NextResponse.json({
        user: {
          id: post.author.email || 'ghost',
          name: post.author.name || 'User',
          username: post.author.username || username,
          email: post.author.email || null,
          avatar: post.author.image || null,
          image: post.author.image || null,
          verified: false,
          bio: post.author.bio || null,
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