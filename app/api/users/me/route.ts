import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import type { InsertOneResult, WithId } from 'mongodb'
import clientPromise from '@/lib/database/mongodb'

export const dynamic = 'force-dynamic'

type UserRecord = {
  _id?: unknown
  email: string
  name?: string | null
  image?: string | null
  username?: string | null
  bio?: string | null
  isVerified?: boolean | null
  createdAt?: Date
  updatedAt?: Date
}

type ProfileRecord = {
  userId?: unknown
  bio?: string | null
  profileImage?: string | null
}

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> => {
  const timeoutPromise = new Promise<T>((_, reject) =>
    setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
  )
  return Promise.race([promise, timeoutPromise])
}

export async function GET() {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Use direct client connection with timeout
    const client = await withTimeout(clientPromise, 10000, 'Database connection timeout')

    const db = client.db('voiceflow_auth')
    const usersCollection = db.collection<UserRecord>('users')
    const profilesCollection = db.collection<ProfileRecord>('profiles')

    // Try to find user in database with timeout
    let user = await withTimeout(
      usersCollection.findOne({ email: session.user.email }),
      8000,
      'User query timeout'
    )

    if (!user) {
      // Create user if not exists (for OAuth users)
      const newUser = {
        email: session.user.email,
        name: session.user.name || 'User',
        image: session.user.image || '/placeholder.svg',
        username: session.user.name?.toLowerCase().replace(/\s+/g, '') || session.user.email?.split('@')[0] || 'user',
        isVerified: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const result = await withTimeout<InsertOneResult<UserRecord>>(
        usersCollection.insertOne(newUser),
        8000,
        'User insert timeout'
      )

      user = { ...newUser, _id: result.insertedId } as WithId<UserRecord>
    }

    // Get additional profile information with timeout
    const profile = await withTimeout(
      profilesCollection.findOne({ userId: (user as WithId<UserRecord>)._id }),
      5000,
      'Profile query timeout'
    )

    const userResponse = {
      id: (user as WithId<UserRecord>)._id,
      name: user.name || user.username,
      email: user.email,
      image: user.image || profile?.profileImage || '/placeholder.svg',
      username: user.username || user.email?.split('@')[0],
      bio: profile?.bio || user.bio || 'Welcome to my profile!',
      isVerified: user.isVerified || false,
      profileImage: profile?.profileImage || user.image || '/placeholder.svg',
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }

    return NextResponse.json({ user: userResponse })
  } catch (error) {
    console.error('Error fetching user profile:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}