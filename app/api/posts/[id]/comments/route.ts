import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { ObjectId, type UpdateFilter, type Document } from 'mongodb'
import { authOptions } from '../../../auth/[...nextauth]/config'
import { getDatabases } from '@/lib/database/mongodb'

export const dynamic = 'force-dynamic'

// GET comments for a post
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    if (!id) {
      return NextResponse.json(
        { error: 'Post ID is required' },
        { status: 400 }
      )
    }

    const { profiles } = await getDatabases()
    const postsCollection = profiles.collection('posts')

    // Find the post
    const post = await postsCollection.findOne({ _id: new ObjectId(id) })

    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      )
    }

    const comments = Array.isArray(post.comments) ? post.comments : []

    return NextResponse.json({ comments })
  } catch (error) {
    console.error('Error fetching comments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    )
  }
}

// POST a new comment
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { id } = params
    const body = await request.json()
    const { content } = body

    if (!id || !content?.trim()) {
      return NextResponse.json(
        { error: 'Post ID and comment content are required' },
        { status: 400 }
      )
    }

    const { profiles } = await getDatabases()
    const usersCollection = profiles.collection('users')
    const postsCollection = profiles.collection('posts')

    // Get user profile
    const userProfile = await usersCollection.findOne({ email: session.user.email })
    const username = userProfile?.username || session.user.name?.toLowerCase().replace(/\s+/g, '') || session.user.email.split('@')[0]

    // Create comment object
    const comment = {
      id: new ObjectId().toString(),
      content: content.trim(),
      author: {
        name: session.user.name || 'Anonymous',
        email: session.user.email,
        username: username,
        image: userProfile?.image || session.user.image || ''
      },
      createdAt: new Date(),
      timestamp: new Date().toISOString()
    }

    // Add comment to post
    const result = await postsCollection.updateOne(
      { _id: new ObjectId(id) },
      { 
        $push: { comments: comment },
        $inc: { replies: 1 }
      } as unknown as UpdateFilter<Document>
    )

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      comment
    })
  } catch (error) {
    console.error('Error adding comment:', error)
    return NextResponse.json(
      { error: 'Failed to add comment' },
      { status: 500 }
    )
  }
}
