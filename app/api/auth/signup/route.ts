import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import clientPromise from '@/lib/database/mongodb'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, username, email, password, phoneNumber, bio } = body

    // Validate required fields (based on our new requirements)
    if (!name || !username || !email || !password || !phoneNumber) {
      return NextResponse.json(
        { message: 'Name, username, email, password, and phone number are required' },
        { status: 400 }
      )
    }

    // Validate username format
    if (username.length < 3 || !/^[a-zA-Z0-9_]+$/.test(username)) {
      return NextResponse.json(
        { message: 'Username must be at least 3 characters and contain only letters, numbers, and underscores' },
        { status: 400 }
      )
    }

    // Validate password length
    if (password.length < 8) {
      return NextResponse.json(
        { message: 'Password must be at least 8 characters long' },
        { status: 400 }
      )
    }

    // Connect to database
    const client = await clientPromise
    const db = client.db('voiceflow_auth')
    const users = db.collection('users')

    // Check if user already exists
    const existingUser = await users.findOne({
      $or: [
        { email: email.toLowerCase() },
        { username: username.toLowerCase() }
      ]
    })

    if (existingUser) {
      return NextResponse.json(
        { message: 'User with this email or username already exists' },
        { status: 409 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create new user with our new field structure
    const newUser = {
      name: name.trim(),
      username: username.toLowerCase().trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      phoneNumber: phoneNumber.trim(),
      bio: bio?.trim() || '', // Optional
      avatar: '', // Optional, empty initially
      emailVerified: null,
      image: null,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    // Insert user
    const result = await users.insertOne(newUser)

    return NextResponse.json(
      { 
        message: 'Account created successfully',
        userId: result.insertedId 
      },
      { status: 201 }
    )

  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
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