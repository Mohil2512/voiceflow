import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../[...nextauth]/config'
import clientPromise from '@/lib/database/mongodb'

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
    const { userId, phoneNumber, username, bio, avatar } = body

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

    // Connect to database
    const client = await clientPromise
    const db = client.db('voiceflow_auth')
    const users = db.collection('users')

    // Check if username is already taken by another user
    const existingUser = await users.findOne({
      username: username.toLowerCase(),
      email: { $ne: session.user.email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Username is already taken' },
        { status: 409 }
      )
    }

    // Update user profile
    const updateData = {
      phoneNumber: phoneNumber.trim(),
      username: username.toLowerCase().trim(),
      bio: bio?.trim() || '',
      avatar: avatar || '',
      updatedAt: new Date()
    }

    const result = await users.updateOne(
      { email: session.user.email },
      { $set: updateData }
    )

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

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

export async function GET(request: NextRequest) {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}

export async function PUT(request: NextRequest) {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}

export async function DELETE(request: NextRequest) {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}