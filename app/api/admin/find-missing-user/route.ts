import { NextResponse } from 'next/server'
import { getDatabases } from '@/lib/database/mongodb'

export const dynamic = 'force-dynamic'

interface OrphanedPost {
  postId: string
  authorEmail: string
  authorName?: string
  authorUsername?: string
  content?: string
}

// Find posts with author info that doesn't match any user
export async function GET() {
  try {
    const { profiles } = await getDatabases()
    const usersCollection = profiles.collection('users')
    const postsCollection = profiles.collection('posts')

    // Get all posts
    const posts = await postsCollection.find({}).toArray()
    
    // Get all users
    const users = await usersCollection.find({}).toArray()
    const userEmails = new Set(users.map(u => u.email))
    
    // Find posts from non-existent users
    const orphanedPosts: OrphanedPost[] = []
    for (const post of posts) {
      const authorEmail = post.author?.email
      if (authorEmail && !userEmails.has(authorEmail)) {
        orphanedPosts.push({
          postId: post._id.toString(),
          authorEmail: authorEmail,
          authorName: post.author?.name || undefined,
          authorUsername: post.author?.username || undefined,
          content: post.content?.substring(0, 50) || undefined
        })
      }
    }

    return NextResponse.json({
      orphanedPosts,
      totalOrphaned: orphanedPosts.length,
      totalPosts: posts.length,
      totalUsers: users.length
    })
  } catch (error) {
    console.error('Error finding missing users:', error)
    return NextResponse.json(
      { error: 'Failed to find missing users' },
      { status: 500 }
    )
  }
}
