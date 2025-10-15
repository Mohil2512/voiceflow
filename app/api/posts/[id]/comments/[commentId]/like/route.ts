import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { getDatabases } from '@/lib/database/mongodb'
import { ObjectId } from 'mongodb'
import { authOptions } from '@/app/api/auth/[...nextauth]/config'

export const dynamic = 'force-dynamic'

// POST /api/posts/[id]/comments/[commentId]/like - Toggle like on a comment
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; commentId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id: postId, commentId } = params
    const userEmail = session.user.email

    const { profiles } = await getDatabases()
    const postsCollection = profiles.collection('posts')

    // Find the post
    const post = await postsCollection.findOne({
      _id: new ObjectId(postId)
    })

    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      )
    }

    // Helper function to toggle like on a comment recursively
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const toggleCommentLike = (comments: any[]): boolean => {
      for (const comment of comments) {
        if (comment._id.toString() === commentId) {
          // Found the comment
          if (!Array.isArray(comment.likes)) {
            comment.likes = []
          }

          const likeIndex = comment.likes.indexOf(userEmail)
          if (likeIndex > -1) {
            // Unlike
            comment.likes.splice(likeIndex, 1)
          } else {
            // Like
            comment.likes.push(userEmail)
            
            // Create notification for comment owner
            if (comment.author?.email && comment.author.email !== userEmail) {
              createNotification(comment.author.email, {
                type: 'comment_like',
                fromUser: {
                  email: session.user.email,
                  name: session.user.name || 'Someone',
                  username: session.user.name?.toLowerCase().replace(/\s+/g, '') || 'user',
                  image: session.user.image || null
                },
                postId: postId,
                commentId: commentId,
                message: `${session.user.name || 'Someone'} liked your comment`
              })
            }
          }
          return true
        }

        // Check nested replies
        if (comment.replies && Array.isArray(comment.replies)) {
          if (toggleCommentLike(comment.replies)) {
            return true
          }
        }
      }
      return false
    }

    // Toggle like on the comment
    const comments = post.comments || []
    const found = toggleCommentLike(comments)

    if (!found) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      )
    }

    // Update the post
    await postsCollection.updateOne(
      { _id: new ObjectId(postId) },
      { $set: { comments } }
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error liking comment:', error)
    return NextResponse.json(
      { error: 'Failed to like comment' },
      { status: 500 }
    )
  }
}

// Helper function to create notification
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function createNotification(userEmail: string, notification: any) {
  try {
    const { profiles } = await getDatabases()
    const notificationsCollection = profiles.collection('notifications')

    await notificationsCollection.insertOne({
      ...notification,
      toUser: userEmail,
      createdAt: new Date(),
      read: false
    })
  } catch (error) {
    console.error('Error creating notification:', error)
  }
}
