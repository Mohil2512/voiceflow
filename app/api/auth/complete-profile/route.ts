import { NextRequest, NextResponse } from 'next/server'
import { getUserCollection } from '@/lib/database/mongodb'
import { VALIDATION_RULES } from '@/lib/database/schemas'
import { ObjectId } from 'mongodb'

export async function POST(request: NextRequest) {
  try {
    const { userId, username, dateOfBirth, gender, phoneNumber } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { message: 'User ID is required' },
        { status: 400 }
      )
    }

    // Get database collection
    const User = await getUserCollection()

    // Convert string ID to ObjectId for MongoDB query
    let objectId
    try {
      objectId = ObjectId.isValid(userId) ? new ObjectId(userId) : userId
    } catch (error) {
      console.log('Using userId as string:', userId)
      objectId = userId
    }

    // Check if user exists (try both ObjectId and string formats)
    let user = await User.findOne({ _id: objectId })
    if (!user && ObjectId.isValid(userId)) {
      // Try string format if ObjectId didn't work
      user = await User.findOne({ _id: userId })
    }
    if (!user) {
      // Try to find by email as last resort
      user = await User.findOne({ email: userId })
    }

    console.log('Found user:', user ? user._id : 'Not found')

    if (!user) {
      return NextResponse.json(
        { message: 'User not found. Please try signing in again.' },
        { status: 404 }
      )
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date()
    }

    // Validate and add username if provided
    if (username && username.trim()) {
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

      // Check if username is already taken
      const existingUser = await User.findOne({ 
        username, 
        _id: { $ne: user._id } 
      })
      
      if (existingUser) {
        return NextResponse.json(
          { message: 'This username is already taken' },
          { status: 400 }
        )
      }

      updateData.username = username.trim()
    }

    // Validate and add date of birth if provided
    if (dateOfBirth && dateOfBirth.trim()) {
      const birthDate = new Date(dateOfBirth)
      const today = new Date()
      let age = today.getFullYear() - birthDate.getFullYear()
      const monthDiff = today.getMonth() - birthDate.getMonth()
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      if (age < 13) {
        return NextResponse.json(
          { message: 'You must be at least 13 years old' },
          { status: 400 }
        )
      }

      updateData.dateOfBirth = new Date(dateOfBirth)
    }

    // Add gender if provided
    if (gender && gender.trim()) {
      const validGenders = ['male', 'female', 'other', 'prefer-not-to-say']
      if (!validGenders.includes(gender)) {
        return NextResponse.json(
          { message: 'Invalid gender value' },
          { status: 400 }
        )
      }
      updateData.gender = gender
    }

    // Validate and add phone number if provided
    if (phoneNumber && phoneNumber.trim()) {
      if (!VALIDATION_RULES.phoneNumber.pattern.test(phoneNumber)) {
        return NextResponse.json(
          { message: 'Invalid phone number format' },
          { status: 400 }
        )
      }
      updateData.phoneNumber = phoneNumber.trim()
    }

    // Check if profile is now complete
    const requiredFields = ['username', 'dateOfBirth', 'gender', 'phoneNumber']
    const currentUser = { ...user, ...updateData }
    
    console.log('Checking profile completion:')
    console.log('Current user data:', currentUser)
    console.log('Required fields check:', requiredFields.map(field => ({
      field,
      value: currentUser[field],
      hasValue: currentUser[field] !== null && currentUser[field] !== undefined && currentUser[field] !== ''
    })))
    
    const isComplete = requiredFields.every(field => {
      const value = currentUser[field]
      const hasValue = value !== null && value !== undefined && value !== ''
      console.log(`Field ${field}:`, { value, hasValue })
      return hasValue
    })
    
    console.log('Profile complete status:', isComplete)
    
    if (isComplete) {
      updateData.profileComplete = true
    } else {
      updateData.profileComplete = false // Explicitly set to false
    }

    // Update user
    const result = await User.updateOne(
      { _id: user._id },
      { $set: updateData }
    )

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { message: 'User not found during update' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { 
        message: 'Profile updated successfully',
        profileComplete: isComplete,
        user: {
          id: user._id.toString(),
          username: updateData.username || user.username,
          dateOfBirth: updateData.dateOfBirth || user.dateOfBirth,
          gender: updateData.gender || user.gender,
          phoneNumber: updateData.phoneNumber || user.phoneNumber,
          profileComplete: isComplete
        }
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Profile completion error:', error)
    return NextResponse.json(
      { message: 'Internal server error. Please try again.' },
      { status: 500 }
    )
  }
}