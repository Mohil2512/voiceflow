import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { ObjectId } from 'mongodb'

// Conditional import of database functions
const getUserCollection = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error('Database not available')
  }
  const { getUserCollection: getCollection } = await import('@/lib/database/mongodb')
  return getCollection()
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const User = await getUserCollection()
    
    // Try to find user by ObjectId first, then by string
    let user
    try {
      if (ObjectId.isValid(session.user.id)) {
        user = await User.findOne({ _id: new ObjectId(session.user.id) })
      }
    } catch (error) {
      console.log('ObjectId lookup failed, trying string lookup')
    }
    
    if (!user) {
      user = await User.findOne({ email: session.user.email })
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found in database' }, { status: 404 })
    }

    return NextResponse.json({
      sessionUser: session.user,
      databaseUser: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        username: user.username,
        dateOfBirth: user.dateOfBirth,
        gender: user.gender,
        phoneNumber: user.phoneNumber,
        profileComplete: user.profileComplete,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    })
  } catch (error) {
    console.error('Debug API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}