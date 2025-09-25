import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

// Import database functions
const getDatabases = async () => {
  try {
    const { getDatabases: getDB } = await import('@/lib/database/mongodb')
    return await getDB();
  } catch (error) {
    console.error('Database connection error:', error);
    throw new Error('Failed to connect to MongoDB Atlas: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
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
      console.error('Authentication failed: No valid session')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const content = formData.get('content') as string
    const images = formData.getAll('images') as File[]

    console.log('Received post request:', { 
      contentLength: content?.length || 0, 
      hasContent: !!content?.trim(),
      imagesCount: images.length,
      user: session.user.email
    })

    if (!content?.trim() && images.length === 0) {
      return NextResponse.json({ error: 'Post content cannot be empty' }, { status: 400 })
    }

    let imageData: { name: string; type: string; data: string; size: number; }[] = []
    
    // Only process images if there are any
    if (images && images.length > 0) {
      try {
        // For now, we'll store images as base64 in the database
        // In production, you'd want to upload to a cloud storage service
        imageData = await Promise.all(
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
      } catch (imageError) {
        console.error('Error processing images:', imageError)
        return NextResponse.json({ error: 'Failed to process images' }, { status: 400 })
      }
    }

    try {
      const databases = await getDatabases()
      const postsDb = databases.activities // Use activities database for posts
      
      // Get user data to ensure we have the correct username
      const authDb = databases.auth;
      const userData = await authDb.collection('users').findOne({ email: session.user.email });
      
      const newPost = {
        content: content || '',
        images: imageData,
        author: {
          name: session.user.name,
          email: session.user.email,
          image: session.user.image,
          username: userData?.username || session.user.username || session.user.email?.split('@')[0] || 'user'
        },
        createdAt: new Date(),
        likes: 0,
        replies: 0
      }

      const result = await postsDb.collection('posts').insertOne(newPost)
      console.log('Post created successfully:', result.insertedId)

      return NextResponse.json({ 
        success: true, 
        postId: result.insertedId,
        message: 'Post created successfully' 
      })
    } catch (dbError) {
      console.error('MongoDB Atlas operation error:', dbError)
      
      let errorMessage = 'Database operation failed';
      let errorDetails = dbError instanceof Error ? dbError.message : 'Unknown database error';
      let errorCode = 'DB_OPERATION_FAILED';
      
      // Provide more specific error messages
      if (dbError instanceof Error) {
        if (dbError.message.includes('SSL') || dbError.message.includes('TLS')) {
          errorMessage = 'Failed to connect to MongoDB Atlas';
          errorDetails = 'MongoDB Atlas SSL/TLS connection issue - check your SSL settings and certificates';
          errorCode = 'MONGODB_SSL_ERROR';
        } else if (dbError.message.includes('authentication failed')) {
          errorMessage = 'MongoDB Atlas authentication failed';
          errorDetails = 'Check your username and password in the connection string';
          errorCode = 'MONGODB_AUTH_ERROR';
        } else if (dbError.message.includes('timed out')) {
          errorMessage = 'MongoDB Atlas connection timed out';
          errorDetails = 'Check your network connection and MongoDB Atlas status';
          errorCode = 'MONGODB_TIMEOUT';
        }
      }
      
      return NextResponse.json({ 
        error: errorMessage, 
        details: errorDetails,
        code: errorCode
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Error creating post:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error',
      code: 'INTERNAL_ERROR'
    }, { status: 500 })
  }
}