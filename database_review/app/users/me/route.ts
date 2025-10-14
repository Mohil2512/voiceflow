import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import clientPromise from '@/lib/database/mongodb'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Use direct client connection with timeout
    const client = await Promise.race([
      clientPromise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database connection timeout')), 10000)
      )
    ]) as any;

    const db = client.db('voiceflow_auth')
    const usersCollection = db.collection('users')
    const profilesCollection = db.collection('profiles')

    // Try to find user in database with timeout
    let user = await Promise.race([
      usersCollection.findOne({ email: session.user.email }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('User query timeout')), 8000)
      )
    ]) as any;

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

      const result = await Promise.race([
        usersCollection.insertOne(newUser),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('User insert timeout')), 8000)
        )
      ]) as any;
      
      user = { ...newUser, _id: result.insertedId }
    }

    // Get additional profile information with timeout
    const profile = await Promise.race([
      profilesCollection.findOne({ userId: user._id }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile query timeout')), 5000)
      )
    ]) as any;

    const userResponse = {
      id: user._id,
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