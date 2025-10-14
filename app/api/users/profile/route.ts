import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { getDatabases } from '@/lib/database/mongodb'

export const dynamic = 'force-dynamic'

export async function GET(_request: NextRequest) {
  void _request
  try {
    const session = await getServerSession()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Return mock user profile
    const mockProfile = {
      id: session.user.email || 'user-id',
      name: session.user.name || 'User',
      email: session.user.email,
      image: session.user.image || '/placeholder.svg',
      username: session.user.name?.toLowerCase().replace(/\s+/g, '') || 'user',
      bio: 'Welcome to my profile!',
      isVerified: false,
      profileImage: session.user.image || '/placeholder.svg'
    }

    return NextResponse.json(mockProfile)
  } catch (error) {
    console.error('Failed to load profile:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

  const formData = await request.formData()
    const name = formData.get('name') as string
    const username = formData.get('username') as string
    const bio = formData.get('bio') as string
    const avatarFile = formData.get('avatar') as File | null

    let avatarUrl: string | null = null
    
    // Handle avatar upload if provided
    if (avatarFile) {
      // Convert to base64 for Cloudinary upload
      const bytes = await avatarFile.arrayBuffer()
      const buffer = Buffer.from(bytes)
      const base64 = `data:${avatarFile.type};base64,${buffer.toString('base64')}`
      
      // Upload to Cloudinary
      const { uploadImage } = await import('@/lib/cloudinary')
      try {
  const uploadResult = await uploadImage(base64, { folder: 'profile' })
        if (uploadResult.success && uploadResult.data) {
          avatarUrl = uploadResult.data.secure_url
          console.log('✅ Avatar uploaded to Cloudinary:', avatarUrl)
        } else {
          console.error('❌ Failed to upload avatar:', uploadResult.error)
        }
      } catch (uploadError) {
        console.error('❌ Failed to upload avatar:', uploadError)
        // Continue without avatar update if upload fails
      }
    }

    // Get MongoDB database
    const { profiles } = await getDatabases()
    const collection = profiles.collection('users')

    // Get existing user profile to preserve current image if no new one uploaded
    const existingProfile = await collection.findOne({ email: session.user.email })
    console.log('🔍 DEBUG: Existing profile found:', existingProfile ? 'Yes' : 'No')
    console.log('🔍 DEBUG: Existing profile image:', existingProfile?.image)
    console.log('🔍 DEBUG: Session user image:', session.user.image)
    
    // Determine which image to use
    let finalImageUrl = avatarUrl // Use new uploaded image if available
    if (!finalImageUrl) {
      // If no new image uploaded, use existing profile image or fall back to session image
      finalImageUrl = existingProfile?.image || session.user.image
    }
    
    console.log('🔍 DEBUG: Final image URL to save:', finalImageUrl)

    // Prepare update data
  const updateData: Record<string, unknown> = {
      name,
      username,
      bio,
      image: finalImageUrl, // Always set image field
      avatar: finalImageUrl, // Keep for backward compatibility
      updatedAt: new Date()
    }

    // Update user profile in database
    const result = await collection.updateOne(
      { email: session.user.email },
      { 
        $set: updateData,
        $setOnInsert: {
          email: session.user.email,
          createdAt: new Date()
        }
      },
      { upsert: true }
    )

    console.log('✅ Profile update result:', result)

    // Get updated user data
    const updatedUser = await collection.findOne({ email: session.user.email })

    // Update all existing posts by this user to reflect the new profile data
    const postsCollection = profiles.collection('posts')
  const postUpdateData: Record<string, unknown> = {
      'author.name': name,
      'author.image': finalImageUrl // Always update author image in posts
    }

    console.log('🔄 Updating posts with data:', postUpdateData)
    console.log('🔄 Looking for posts with author.email:', session.user.email)

    const postsUpdateResult = await postsCollection.updateMany(
      { 'author.email': session.user.email },
      { $set: postUpdateData }
    )

    console.log('✅ Updated posts result:', {
      acknowledged: postsUpdateResult.acknowledged,
      modifiedCount: postsUpdateResult.modifiedCount,
      matchedCount: postsUpdateResult.matchedCount
    })

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: updatedUser?._id?.toString(),
        name: updatedUser?.name,
        username: updatedUser?.username,
        bio: updatedUser?.bio,
        image: updatedUser?.image || updatedUser?.avatar,
        email: updatedUser?.email
      }
    })
  } catch (error) {
    console.error('❌ Profile update error:', error)
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  return NextResponse.json(
    { message: 'Profile deleted successfully (mock)' },
    { status: 200 }
  )
}