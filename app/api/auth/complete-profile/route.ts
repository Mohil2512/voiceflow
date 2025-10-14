import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../[...nextauth]/config'
import { getDatabases } from '@/lib/database/mongodb'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // Get user session
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Parse request body
  const body = await request.json()
  const { phoneNumber, username, bio, avatar } = body

    // Validate required fields
    if (!phoneNumber || !username) {
      return NextResponse.json(
        { error: 'Phone number and username are required' },
        { status: 400 }
      )
    }

    // Validate username format
    if (username.length < 3 || !/^[a-zA-Z0-9_]+$/.test(username)) {
      return NextResponse.json(
        { error: 'Username must be at least 3 characters and contain only letters, numbers, and underscores' },
        { status: 400 }
      )
    }

    // Connect to databases
    const { auth, profiles } = await getDatabases()
    const authUsers = auth.collection('users')
    const profileUsers = profiles.collection('users')

    // Check if username is already taken by another user (check both databases)
    const existingUserAuth = await authUsers.findOne({
      username: username.toLowerCase(),
      email: { $ne: session.user.email }
    })
    
    const existingUserProfiles = await profileUsers.findOne({
      username: username.toLowerCase(),
      email: { $ne: session.user.email }
    })

    if (existingUserAuth || existingUserProfiles) {
      return NextResponse.json(
        { error: 'Username is already taken' },
        { status: 409 }
      )
    }

    // Update user profile in both databases
    const updateData = {
      phoneNumber: phoneNumber.trim(),
      username: username.toLowerCase().trim(),
      bio: bio?.trim() || '',
      image: avatar || session.user.image || '',
      name: session.user.name || username,
      updatedAt: new Date()
    }

    // Update in auth database
    await authUsers.updateOne(
      { email: session.user.email },
      { $set: updateData },
      { upsert: true }
    )

    // Update in profiles database (used by posts API)
    await profileUsers.updateOne(
      { email: session.user.email },
      { $set: updateData },
      { upsert: true }
    )

    return NextResponse.json(
      { 
        success: true,
        message: 'Profile completed successfully',
        user: {
          ...session.user,
          ...updateData
        }
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Complete profile error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}