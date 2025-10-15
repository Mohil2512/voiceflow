import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/config'
import { getDatabases } from '@/lib/database/mongodb'
import { uploadImage } from '@/lib/cloudinary'
import { serverEnv } from '@/lib/env'
import { createNotification } from '@/lib/notifications'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  console.log('POST /api/posts/create - Creating post...')
  
  try {
    // Get user session
    const session = await getServerSession(authOptions)
    if (!session?.user?.email || !session?.user?.name) {
      return NextResponse.json(
        { error: 'Authentication required - user must have name and email' },
        { status: 401 }
      )
    }

    // Parse FormData instead of JSON
  const formData = await request.formData()
  const rawContent = formData.get('content')
  const content = typeof rawContent === 'string' ? rawContent : ''
  const trimmedContent = content.trim()
    
    // Handle multiple image uploads
  const imageFiles = formData.getAll('images') as File[]
  const imageUrls: string[] = []

    console.log('📝 Post creation request:')
  console.log('  Content:', content)
    console.log('  Image files count:', imageFiles.length)
    console.log('  FormData keys:', Array.from(formData.keys()))
    
    if (imageFiles.length > 0) {
      imageFiles.forEach((file, index) => {
        console.log(`  Image ${index + 1}:`, {
          name: file.name,
          size: file.size,
          type: file.type
        })
      })
    }

    const hasImagesInPayload = imageFiles.some(file => file && file.size > 0)

    if (!trimmedContent && !hasImagesInPayload) {
      return NextResponse.json(
        { error: 'Add text or at least one image before posting.' },
        { status: 400 }
      )
    }

    // Upload images to Cloudinary if any
    if (imageFiles.length > 0) {
      if (!serverEnv.CLOUDINARY_CLOUD_NAME || !serverEnv.CLOUDINARY_API_KEY || !serverEnv.CLOUDINARY_API_SECRET) {
        return NextResponse.json(
          {
            error: 'Image uploads are not configured for this deployment.',
            details: 'Missing Cloudinary environment variables (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET).',
            code: 'CLOUDINARY_CONFIG_MISSING'
          },
          { status: 500 }
        )
      }

      console.log(`🔥 Uploading ${imageFiles.length} images to Cloudinary...`)
      
      for (const imageFile of imageFiles) {
        if (imageFile && imageFile.size > 0) {
          try {
            console.log(`📤 Processing image: ${imageFile.name} (${imageFile.size} bytes)`)
            
            // Convert file to base64 for Cloudinary upload
            const bytes = await imageFile.arrayBuffer()
            const buffer = Buffer.from(bytes)
            const base64 = `data:${imageFile.type};base64,${buffer.toString('base64')}`
            
            console.log('🔗 Base64 conversion complete, uploading to Cloudinary...')
            
            const uploadResult = await uploadImage(base64, {
              public_id: `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              transformation: [
                { width: 1280, height: 1280, crop: 'limit' },
                { quality: 'auto:good' },
                { fetch_format: 'auto' }
              ],
              format: 'webp'
            })
            
            console.log('🔥 Cloudinary upload result:', uploadResult)
            
            if (uploadResult.success && uploadResult.data) {
              imageUrls.push(uploadResult.data.secure_url)
              console.log('✅ Image uploaded successfully:', uploadResult.data.secure_url)
            } else {
              console.error('❌ Failed to upload image:', uploadResult.error)
              return NextResponse.json(
                {
                  error: 'Image upload failed.',
                  details: uploadResult.error || 'Unknown upload error',
                  code: 'CLOUDINARY_UPLOAD_FAILED'
                },
                { status: 502 }
              )
            }
          } catch (error) {
            console.error('💥 Error processing image:', error)
            const message = error instanceof Error ? error.message : 'Unknown error while processing image'
            return NextResponse.json(
              {
                error: 'Unable to process image for upload.',
                details: message,
                code: 'IMAGE_PROCESSING_FAILED'
              },
              { status: 500 }
            )
          }
        } else {
          console.log('⚠️ Skipping empty or invalid image file')
        }
      }
      
      console.log(`📊 Final image URLs count: ${imageUrls.length}`)
    } else {
      console.log('📄 No images to upload')
    }

    // Connect to database using getDatabases
    const { profiles } = await getDatabases()
    const usersCollection = profiles.collection('users')
    const postsCollection = profiles.collection('posts')

    // Get user profile to include username
    const userProfile = await usersCollection.findOne({ email: session.user.email })
    const username = userProfile?.username || session.user.name?.toLowerCase().replace(/\s+/g, '') || session.user.email.split('@')[0]

    // Create new post
    const newPost = {
      content: trimmedContent,
      author: {
        name: session.user.name,
        email: session.user.email,
        username: username,
        image: session.user.image || ''
      },
      images: imageUrls,
      location: null,
      createdAt: new Date(),
      likes: 0,
      likedBy: [],
      replies: 0,
      reposts: 0,
      repostedBy: [],
      comments: []
    }

    // Insert post into database
    const result = await postsCollection.insertOne(newPost)

    console.log('Post created successfully:', result.insertedId)

    // Notify followers about new post
    const followers = Array.isArray(userProfile?.followers) ? userProfile.followers : []
    if (followers.length > 0) {
      for (const followerEmail of followers) {
        await createNotification({
          type: 'post',
          fromUser: {
            email: session.user.email,
            name: session.user.name,
            username: username,
            image: session.user.image
          },
          toUserEmail: followerEmail,
          postId: result.insertedId.toString(),
          message: `${session.user.name} posted something new`
        })
      }
    }

    // Return success response
    return NextResponse.json(
      { 
        success: true, 
        postId: result.insertedId,
        message: 'Post created successfully' 
      },
      { status: 201 }
    )

  } catch (error) {
    console.error('Error creating post:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined
    console.error('Error details:', { message: errorMessage, stack: errorStack })
    
    return NextResponse.json(
      { 
        error: 'Failed to create post',
        details: errorMessage,
        code: 'POST_CREATION_ERROR'
      },
      { status: 500 }
    )
  }
}