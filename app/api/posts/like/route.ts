import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/config'
import { getDatabases } from '@/lib/database/mongodb'
import { ObjectId } from 'mongodb'
import { createNotification } from '@/lib/notifications'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const { postId, liked } = body

    if (!postId) {
      return NextResponse.json(
        { error: 'postId is required' },
        { status: 400 }
      )
    }

    if (typeof liked !== 'boolean') {
      return NextResponse.json(
        { error: 'liked flag must be a boolean value' },
        { status: 400 }
      )
    }

    let postObjectId: ObjectId
    try {
      postObjectId = new ObjectId(postId)
    } catch {
      return NextResponse.json(
        { error: 'Invalid postId' },
        { status: 400 }
      )
    }

    const { profiles } = await getDatabases()
    const postsCollection = profiles.collection('posts')
    const usersCollection = profiles.collection('users')

    const post = await postsCollection.findOne({ _id: postObjectId })
    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      )
    }

    const currentLikes = Array.isArray(post.likedBy) ? post.likedBy : []
    let updatedLikedBy = currentLikes.filter((email): email is string => typeof email === 'string')
    const userEmail = session.user.email

    if (liked) {
      if (!updatedLikedBy.includes(userEmail)) {
        updatedLikedBy.push(userEmail)
        
        // Get current user details for notification
        const currentUser = await usersCollection.findOne({ email: userEmail })
        
        // Notify post author about the like
        if (post.author?.email && post.author.email !== userEmail) {
          await createNotification({
            type: 'like',
            fromUser: {
              email: userEmail,
              name: session.user.name || 'User',
              username: currentUser?.username,
              image: session.user.image
            },
            toUserEmail: post.author.email,
            postId: postId,
            message: `${session.user.name} liked your post`
          })
        }
      }
    } else {
      updatedLikedBy = updatedLikedBy.filter(email => email !== userEmail)
    }

    await postsCollection.updateOne(
      { _id: postObjectId },
      {
        $set: {
          likedBy: updatedLikedBy,
          likes: updatedLikedBy.length,
          updatedAt: new Date()
        }
      }
    )

    return NextResponse.json({
      liked: updatedLikedBy.includes(userEmail),
      likes: updatedLikedBy.length
    })
  } catch (error) {
    console.error('Error updating like status:', error)
    return NextResponse.json(
      { error: 'Failed to update like status' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

export const PUT = GET
export const DELETE = GET