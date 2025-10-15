import { NextResponse } from 'next/server'
import { getDatabases } from '@/lib/database/mongodb'

export const dynamic = 'force-dynamic'

// GET /api/admin/list-all-posts - List all posts with author info
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET() {
  try {
    const { profiles } = await getDatabases()
    const postsCollection = profiles.collection('posts')

    // Get all posts
    const allPosts = await postsCollection.find({}).toArray()

    return NextResponse.json({
      total: allPosts.length,
      posts: allPosts.map(post => ({
        id: post._id.toString(),
        content: post.content?.substring(0, 50) + '...',
        authorEmail: post.author?.email,
        authorName: post.author?.name,
        authorUsername: post.author?.username,
        createdAt: post.createdAt
      }))
    })
  } catch (error) {
    console.error('Error listing posts:', error)
    return NextResponse.json(
      { error: 'Failed to list posts' },
      { status: 500 }
    )
  }
}
