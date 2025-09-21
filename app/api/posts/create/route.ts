import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

// Conditional import of database functions
const getDatabases = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error('Database not available')
  }
  const { getDatabases: getDB } = await import('@/lib/database/mongodb')
  return getDB()
}

const authOptions = {
  // We'll get the session directly from the request headers
  secret: process.env.NEXTAUTH_SECRET,
}

export async function POST(request: NextRequest) {
  try {
    // Get session from the request
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const content = formData.get('content') as string
    const location = formData.get('location') as string
    const images = formData.getAll('images') as File[]

    if (!content?.trim() && images.length === 0) {
      return NextResponse.json({ error: 'Post content cannot be empty' }, { status: 400 })
    }

    // For now, we'll store images as base64 in the database
    // In production, you'd want to upload to a cloud storage service
    const imageData = await Promise.all(
      images.map(async (image) => {
        const bytes = await image.arrayBuffer()
        const buffer = Buffer.from(bytes)
        return {
          name: image.name,
          type: image.type,
          data: buffer.toString('base64'),
          size: image.size
        }
      })
    )

    const databases = await getDatabases()
    const postsDb = databases.activities // Use activities database for posts
    
    const newPost = {
      content: content || '',
      location: location || null,
      images: imageData,
      author: {
        name: session.user.name,
        email: session.user.email,
        image: session.user.image
      },
      createdAt: new Date(),
      likes: 0,
      replies: 0
    }

    const result = await postsDb.collection('posts').insertOne(newPost)

    return NextResponse.json({ 
      success: true, 
      postId: result.insertedId,
      message: 'Post created successfully' 
    })

  } catch (error) {
    console.error('Error creating post:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}