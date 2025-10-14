import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/config'
import { getDatabases } from '@/lib/database/mongodb'
import { uploadImage } from '@/lib/cloudinary'

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
    const content = formData.get('content') as string
    
    // Handle multiple image uploads
    const imageFiles = formData.getAll('images') as File[]
    let imageUrls: string[] = []

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

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Post content is required' },
        { status: 400 }
      )
    }

    // Upload images to Cloudinary if any
    if (imageFiles.length > 0) {
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
                { width: 800, height: 600, crop: 'limit' },
                { quality: 'auto' },
                { fetch_format: 'auto' }
              ]
            })
            
            console.log('🔥 Cloudinary upload result:', uploadResult)
            
            if (uploadResult.success && uploadResult.data) {
              imageUrls.push(uploadResult.data.secure_url)
              console.log('✅ Image uploaded successfully:', uploadResult.data.secure_url)
            } else {
              console.error('❌ Failed to upload image:', uploadResult.error)
            }
          } catch (error) {
            console.error('💥 Error processing image:', error)
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
    const collection = profiles.collection('posts')

    // Create new post
    const newPost = {
      content: content.trim(),
      author: {
        name: session.user.name,
        email: session.user.email,
        image: session.user.image || ''
      },
      images: imageUrls,
      location: null,
      createdAt: new Date(),
      likes: 0,
      replies: 0,
      reposts: 0
    }

    // Insert post into database
    const result = await collection.insertOne(newPost)

    console.log('Post created successfully:', result.insertedId)

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
    return NextResponse.json(
      { error: 'Failed to create post' },
      { status: 500 }
    )
  }
}