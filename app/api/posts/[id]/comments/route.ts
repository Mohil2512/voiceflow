import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { ObjectId, type UpdateFilter, type Document } from 'mongodb'
import { authOptions } from '../../../auth/[...nextauth]/config'
import { getDatabases } from '@/lib/database/mongodb'
import { createNotification } from '@/lib/notifications'

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
    const { content, parentId } = body

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
      _id: new ObjectId().toString(),
      content: content.trim(),
      author: {
        name: session.user.name || 'Anonymous',
        email: session.user.email,
        username: username,
        avatar: userProfile?.image || session.user.image || ''
      },
      createdAt: new Date(),
      replies: []
    }

    // Get post details for notifications
    const post = await postsCollection.findOne({ _id: new ObjectId(id) })
    
    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      )
    }

    // If parentId is provided, add as nested reply
    if (parentId) {
      // Find parent comment to get author email
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const findParentComment = (comments: any[]): any => {
        for (const c of comments) {
          if (c._id === parentId) return c
          if (c.replies?.length > 0) {
            const found = findParentComment(c.replies)
            if (found) return found
          }
        }
        return null
      }
      
      const parentComment = findParentComment(post.comments || [])
      
      // Add reply to parent comment
      const result = await postsCollection.updateOne(
        { 
          _id: new ObjectId(id),
          'comments._id': parentId
        },
        { 
          $push: { 'comments.$.replies': comment }
        } as unknown as UpdateFilter<Document>
      )

      if (result.matchedCount === 0) {
        return NextResponse.json(
          { error: 'Parent comment not found' },
          { status: 404 }
        )
      }
      
      // Notify parent comment author about reply
      if (parentComment?.author?.email && parentComment.author.email !== session.user.email) {
        await createNotification({
          type: 'comment_reply',
          fromUser: {
            email: session.user.email,
            name: session.user.name || 'User',
            username: username,
            image: userProfile?.image || session.user.image
          },
          toUserEmail: parentComment.author.email,
          postId: id,
          commentId: parentId,
          message: `${session.user.name} replied to your comment`
        })
      }
    } else {
      // Add as top-level comment
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
      
      // Notify post author about comment
      if (post.author?.email && post.author.email !== session.user.email) {
        await createNotification({
          type: 'comment',
          fromUser: {
            email: session.user.email,
            name: session.user.name || 'User',
            username: username,
            image: userProfile?.image || session.user.image
          },
          toUserEmail: post.author.email,
          postId: id,
          commentId: comment._id,
          message: `${session.user.name} commented on your post`
        })
      }
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
