import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { getDatabases } from '@/lib/database/mongodb'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: { identifier: string } }
) {
  try {
    const session = await getServerSession()
    const identifier = params.identifier

    // Get MongoDB databases
    const { profiles } = await getDatabases()
    const usersCollection = profiles.collection('users')

    // Try to find user by email or username
  const user = await usersCollection.findOne({
      $or: [
        { email: identifier },
        { username: identifier }
      ]
    })

    if (!user) {
      // If user is trying to access their own profile via email and not found in DB
      if (session?.user?.email === identifier) {
        const mockUser = {
          id: session.user.email || 'user-id',
          name: session.user.name || 'User',
          email: session.user.email,
          image: session.user.image || '/placeholder.svg',
          username: session.user.name?.toLowerCase().replace(/\s+/g, '') || 'user',
          bio: 'Welcome to my profile!',
          isVerified: false,
          profileImage: session.user.image || '/placeholder.svg'
        }
        
        return NextResponse.json(mockUser)
      }

      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const userResponse = {
      id: user._id?.toString(),
      name: user.name || user.username,
      email: user.email,
      image: user.image || user.avatar || '/placeholder.svg',
      username: user.username || user.email?.split('@')[0],
      bio: user.bio || 'No bio available',
      isVerified: user.isVerified || false,
      profileImage: user.image || user.avatar || '/placeholder.svg',
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }

    return NextResponse.json(userResponse)
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}