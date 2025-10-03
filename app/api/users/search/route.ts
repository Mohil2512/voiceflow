import { NextRequest, NextResponse } from 'next/server'
import { getDatabases } from '@/lib/database/mongodb'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')

    console.log('🔍 Users search query:', query)

    if (!query || query.trim().length === 0) {
      return NextResponse.json([])
    }

    const { profiles } = await getDatabases()
    const usersCollection = profiles.collection('users')

    console.log('🔍 Database connection established')

    // Create search regex for case-insensitive search
    const searchRegex = new RegExp(query.trim(), 'i')

    console.log('🔍 Searching with regex:', searchRegex)

    // Search users by name, username, or email
    const users = await usersCollection.find({
      $or: [
        { name: { $regex: searchRegex } },
        { username: { $regex: searchRegex } },
        { email: { $regex: searchRegex } },
        { bio: { $regex: searchRegex } }
      ]
    }).limit(20).toArray()

    console.log('🔍 Found users count:', users.length)

    // Format users for frontend
    const formattedUsers = users.map(user => ({
      id: user._id.toString(),
      name: user.name || 'Unknown User',
      email: user.email || '',
      image: user.image || null,
      bio: user.bio || null,
      username: user.username || user.email?.split('@')[0] || 'unknown',
      isVerified: user.isVerified || false
    }))

    console.log('🔍 Returning formatted users:', formattedUsers.length)
    return NextResponse.json(formattedUsers)
  } catch (error) {
    console.error('❌ Users search error:', error)
    return NextResponse.json(
      { error: 'Failed to search users', details: error.message },
      { status: 500 }
    )
  }
}