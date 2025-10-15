import { NextRequest, NextResponse } from 'next/server'
import { getDatabases } from '@/lib/database/mongodb'

export const dynamic = 'force-dynamic'

// DELETE /api/admin/cleanup-orphaned-posts - Remove posts from non-existent users
export async function DELETE(_request: NextRequest) {
  try {
    const { profiles } = await getDatabases()
    const postsCollection = profiles.collection('posts')
    const usersCollection = profiles.collection('users')

    // Get all posts
    const allPosts = await postsCollection.find({}).toArray()

    // Get all user emails
    const allUsers = await usersCollection.find({}, { projection: { email: 1 } }).toArray()
    const userEmails = new Set(allUsers.map(user => user.email))

    // Find orphaned posts
    const orphanedPosts = allPosts.filter(post => {
      const authorEmail = post.author?.email
      return authorEmail && !userEmails.has(authorEmail)
    })

    if (orphanedPosts.length === 0) {
      return NextResponse.json({
        message: 'No orphaned posts found',
        deleted: 0
      })
    }

    // Delete orphaned posts
    const orphanedIds = orphanedPosts.map(post => post._id)
    const deleteResult = await postsCollection.deleteMany({
      _id: { $in: orphanedIds }
    })

    return NextResponse.json({
      message: `Deleted ${deleteResult.deletedCount} orphaned posts`,
      deleted: deleteResult.deletedCount,
      orphanedPosts: orphanedPosts.map(post => ({
        id: post._id.toString(),
        author: post.author?.username || post.author?.email,
        content: post.content?.substring(0, 50) + '...'
      }))
    })
  } catch (error) {
    console.error('Error cleaning up orphaned posts:', error)
    return NextResponse.json(
      { error: 'Failed to cleanup orphaned posts' },
      { status: 500 }
    )
  }
}
