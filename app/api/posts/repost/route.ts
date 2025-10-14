import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/config'
import { getDatabases } from '@/lib/database/mongodb'
import { ObjectId } from 'mongodb'

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
    const { postId, reposted, repostId } = body

    if (!postId) {
      return NextResponse.json(
        { error: 'postId is required' },
        { status: 400 }
      )
    }

    if (typeof reposted !== 'boolean') {
      return NextResponse.json(
        { error: 'reposted flag must be a boolean value' },
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

    let repostObjectId: ObjectId | null = null
    if (typeof repostId === 'string' && repostId.trim().length > 0) {
      try {
        repostObjectId = new ObjectId(repostId)
      } catch {
        repostObjectId = null
      }
    }

    const { profiles } = await getDatabases()
    const postsCollection = profiles.collection('posts')

    const post = await postsCollection.findOne({ _id: postObjectId })
    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      )
    }

    const currentReposts = Array.isArray(post.repostedBy) ? post.repostedBy : []
    let updatedRepostedBy = currentReposts.filter((email): email is string => typeof email === 'string')
    const userEmail = session.user.email

    const usersCollection = profiles.collection('users')
    const userProfile = await usersCollection.findOne({ email: userEmail })

    if (reposted) {
      if (!updatedRepostedBy.includes(userEmail)) {
        updatedRepostedBy.push(userEmail)
      }

      const existingRepostDoc = await postsCollection.findOne({
        isRepost: true,
        originalPostId: postObjectId,
        'author.email': userEmail
      })

      if (!existingRepostDoc) {
        const reposterAuthor = {
          id: session.user.id || session.user.email,
          name: userProfile?.name || session.user.name || 'User',
          email: userEmail,
          username: userProfile?.username || session.user.name?.toLowerCase()?.replace(/\s+/g, '') || userEmail.split('@')[0],
          image: userProfile?.image || session.user.image || ''
        }

        const repostDocument = {
          isRepost: true,
          originalPostId: postObjectId,
          originalAuthor: post.author,
          originalCreatedAt: post.createdAt || new Date(),
          author: reposterAuthor,
          content: typeof post.content === 'string' ? post.content : '',
          images: Array.isArray(post.images) ? post.images : [],
          likedBy: [],
          repostedBy: [],
          createdAt: new Date(),
          updatedAt: new Date()
        }

        await postsCollection.insertOne(repostDocument)
      }
    } else {
      updatedRepostedBy = updatedRepostedBy.filter(email => email !== userEmail)

      await postsCollection.deleteOne({
        isRepost: true,
        originalPostId: postObjectId,
        'author.email': userEmail
      })

      if (repostObjectId) {
        await postsCollection.deleteOne({ _id: repostObjectId })
      }
    }

    await postsCollection.updateOne(
      { _id: postObjectId },
      {
        $set: {
          repostedBy: updatedRepostedBy,
          reposts: updatedRepostedBy.length,
          updatedAt: new Date()
        }
      }
    )

    return NextResponse.json({
      reposted: updatedRepostedBy.includes(userEmail),
      reposts: updatedRepostedBy.length
    })
  } catch (error) {
    console.error('Error updating repost status:', error)
    return NextResponse.json(
      { error: 'Failed to update repost status' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

export const PUT = GET
export const DELETE = GET