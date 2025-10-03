import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/config'
import { getDatabases } from '@/lib/database/mongodb'
import { ObjectId } from 'mongodb'
import { uploadImage } from '@/lib/cloudinary'

export const dynamic = 'force-dynamic'

// GET single post
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { profiles } = await getDatabases()
    const post = await profiles.collection('posts').findOne({ 
      _id: new ObjectId(params.id) 
    })

    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      )
    }

    // Transform post to match frontend expectations
    const transformedPost = {
      id: post._id.toString(),
      user: {
        name: post.author?.name || 'Anonymous',
        username: post.author?.email?.split('@')[0] || 'anonymous',
        avatar: post.author?.image || '',
        image: post.author?.image || '',
        email: post.author?.email || '',
        verified: false
      },
      content: post.content,
      timestamp: post.createdAt?.toISOString() || post.timestamp || new Date().toISOString(),
      likes: post.likes || 0,
      replies: post.replies || 0,
      reposts: post.reposts || 0,
      images: post.images || [],
      isLiked: false,
      isReposted: false
    }

    return NextResponse.json(transformedPost)
  } catch (error) {
    console.error('Error fetching post:', error)
    return NextResponse.json(
      { error: 'Failed to fetch post' },
      { status: 500 }
    )
  }
}

// PUT - Update post
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get user session
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { profiles } = await getDatabases()
    
    // Check if post exists and user owns it
    const existingPost = await profiles.collection('posts').findOne({
      _id: new ObjectId(params.id)
    })

    if (!existingPost) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      )
    }

    if (existingPost.author?.email !== session.user.email) {
      return NextResponse.json(
        { error: 'Unauthorized - you can only edit your own posts' },
        { status: 403 }
      )
    }

    // Parse FormData for content and images
    const formData = await request.formData()
    const content = formData.get('content') as string
    const imageFiles = formData.getAll('images') as File[]
    let imageUrls: string[] = [...(existingPost.images || [])] // Keep existing images

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Post content is required' },
        { status: 400 }
      )
    }

    // Handle new image uploads
    if (imageFiles.length > 0) {
      console.log(`Uploading ${imageFiles.length} new images...`)
      
      for (const imageFile of imageFiles) {
        if (imageFile && imageFile.size > 0) {
          try {
            const bytes = await imageFile.arrayBuffer()
            const buffer = Buffer.from(bytes)
            const base64 = `data:${imageFile.type};base64,${buffer.toString('base64')}`
            
            const uploadResult = await uploadImage(base64, {
              public_id: `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              transformation: [
                { width: 800, height: 600, crop: 'limit' },
                { quality: 'auto' },
                { fetch_format: 'auto' }
              ]
            })
            
            if (uploadResult.success && uploadResult.data) {
              imageUrls.push(uploadResult.data.secure_url)
            }
          } catch (error) {
            console.error('Error uploading image:', error)
          }
        }
      }
    }

    // Update the post
    const updateData = {
      content: content.trim(),
      images: imageUrls,
      updatedAt: new Date()
    }

    const result = await profiles.collection('posts').updateOne(
      { _id: new ObjectId(params.id) },
      { $set: updateData }
    )

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      )
    }

    console.log('Post updated successfully:', params.id)
    return NextResponse.json({
      success: true,
      message: 'Post updated successfully'
    })

  } catch (error) {
    console.error('Error updating post:', error)
    return NextResponse.json(
      { error: 'Failed to update post' },
      { status: 500 }
    )
  }
}

// DELETE post
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get user session
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { profiles } = await getDatabases()
    
    // Check if post exists and user owns it
    const existingPost = await profiles.collection('posts').findOne({
      _id: new ObjectId(params.id)
    })

    if (!existingPost) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      )
    }

    if (existingPost.author?.email !== session.user.email) {
      return NextResponse.json(
        { error: 'Unauthorized - you can only delete your own posts' },
        { status: 403 }
      )
    }

    // Delete the post
    const result = await profiles.collection('posts').deleteOne({
      _id: new ObjectId(params.id)
    })

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      )
    }

    console.log('Post deleted successfully:', params.id)
    return NextResponse.json({
      success: true,
      message: 'Post deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting post:', error)
    return NextResponse.json(
      { error: 'Failed to delete post' },
      { status: 500 }
    )
  }
}