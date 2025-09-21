import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { VALIDATION_RULES } from '@/lib/database/schemas'

// Conditional import of database functions
const getUserCollection = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error('Database not available')
  }
  const { getUserCollection: getCollection } = await import('@/lib/database/mongodb')
  return getCollection()
}

export async function POST(request: NextRequest) {
  try {
    const { name, username, email, password, dateOfBirth, gender, phoneNumber } = await request.json()

    // Validation
    if (!name || !username || !email || !password || !dateOfBirth || !gender || !phoneNumber) {
      return NextResponse.json(
        { message: 'All fields are required' },
        { status: 400 }
      )
    }

    // Username validation
    if (username.length < VALIDATION_RULES.username.minLength) {
      return NextResponse.json(
        { message: `Username must be at least ${VALIDATION_RULES.username.minLength} characters long` },
        { status: 400 }
      )
    }

    if (!VALIDATION_RULES.username.pattern.test(username)) {
      return NextResponse.json(
        { message: 'Username can only contain letters, numbers, and underscores' },
        { status: 400 }
      )
    }

    // Password validation
    if (password.length < VALIDATION_RULES.password.minLength) {
      return NextResponse.json(
        { message: `Password must be at least ${VALIDATION_RULES.password.minLength} characters long` },
        { status: 400 }
      )
    }

    // Age validation
    const birthDate = new Date(dateOfBirth)
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    if (age < 13) {
      return NextResponse.json(
        { message: 'You must be at least 13 years old to create an account' },
        { status: 400 }
      )
    }

    // Get database collection
    const User = await getUserCollection()

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    })

    if (existingUser) {
      if (existingUser.email === email) {
        return NextResponse.json(
          { message: 'An account with this email already exists' },
          { status: 400 }
        )
      } else {
        return NextResponse.json(
          { message: 'This username is already taken' },
          { status: 400 }
        )
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user
    const newUser = {
      name,
      username,
      email,
      password: hashedPassword,
      dateOfBirth: new Date(dateOfBirth),
      gender,
      phoneNumber,
      provider: 'credentials',
      emailVerified: false,
      isActive: true,
      profileComplete: true, // Manual signup has all required fields
      lastLogin: null,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const result = await User.insertOne(newUser)

    if (!result.insertedId) {
      throw new Error('Failed to create user')
    }

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