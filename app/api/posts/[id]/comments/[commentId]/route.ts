import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { ObjectId } from 'mongodb'
import { authOptions } from '@/app/api/auth/[...nextauth]/config'
import { getDatabases } from '@/lib/database/mongodb'

export const dynamic = 'force-dynamic'

type MongoComment = {
  _id: string
  content: string
  author?: {
    email?: string
    [key: string]: unknown
  }
  replies?: MongoComment[]
  likes?: string[]
  editedAt?: Date | string
  [key: string]: unknown
}

const cloneCommentTree = (comments: MongoComment[] = []): MongoComment[] => {
  return comments.map((comment) => ({
    ...comment,
    likes: Array.isArray(comment.likes) ? [...comment.likes] : [],
    replies: cloneCommentTree(comment.replies || []),
  }))
}

const findCommentById = (
  comments: MongoComment[],
  commentId: string,
  parent: MongoComment | null = null
): { comment: MongoComment; parent: MongoComment | null; topLevel: boolean } | null => {
  for (const comment of comments) {
    if (comment._id?.toString() === commentId) {
      return { comment, parent, topLevel: parent === null }
    }

    if (Array.isArray(comment.replies) && comment.replies.length > 0) {
      const found = findCommentById(comment.replies, commentId, comment)
      if (found) {
        return found
      }
    }
  }

  return null
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; commentId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { id: postId, commentId } = params
    const body = await request.json().catch(() => ({}))
    const content = typeof body?.content === 'string' ? body.content.trim() : ''

    if (!content) {
      return NextResponse.json({ error: 'Comment content is required' }, { status: 400 })
    }

    const { profiles } = await getDatabases()
    const postsCollection = profiles.collection('posts')

    const post = await postsCollection.findOne({ _id: new ObjectId(postId) })

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    const commentsTree = cloneCommentTree(post.comments || [])
    const match = findCommentById(commentsTree, commentId)

    if (!match) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    if (match.comment.author?.email !== session.user.email) {
      return NextResponse.json({ error: 'Not allowed to edit this comment' }, { status: 403 })
    }

    match.comment.content = content
    match.comment.editedAt = new Date()

    await postsCollection.updateOne(
      { _id: new ObjectId(postId) },
      { $set: { comments: commentsTree } }
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating comment:', error)
    return NextResponse.json({ error: 'Failed to update comment' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string; commentId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { id: postId, commentId } = params

    const { profiles } = await getDatabases()
    const postsCollection = profiles.collection('posts')

    const post = await postsCollection.findOne({ _id: new ObjectId(postId) })

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    const commentsTree = cloneCommentTree(post.comments || [])
    const match = findCommentById(commentsTree, commentId)

    if (!match) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    if (match.comment.author?.email !== session.user.email) {
      return NextResponse.json({ error: 'Not allowed to delete this comment' }, { status: 403 })
    }

    if (match.parent) {
      match.parent.replies = (match.parent.replies || []).filter(
        (reply) => reply._id?.toString() !== commentId
      )
    } else {
      const index = commentsTree.findIndex((entry) => entry._id?.toString() === commentId)
      if (index === -1) {
        return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
      }
      commentsTree.splice(index, 1)
    }

    const updateOperations: Record<string, unknown> = {
      $set: { comments: commentsTree },
    }

    if (match.topLevel) {
      updateOperations.$inc = { replies: -1 }
    }

    await postsCollection.updateOne(
      { _id: new ObjectId(postId) },
      updateOperations
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting comment:', error)
    return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 })
  }
}
