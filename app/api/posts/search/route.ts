import { NextRequest, NextResponse } from 'next/server'
import { getDatabases } from '@/lib/database/mongodb'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')

    if (!query || query.trim().length === 0) {
      return NextResponse.json([])
    }

    const { profiles } = await getDatabases()
    const postsCollection = profiles.collection('posts')

    // Create search regex for case-insensitive search
    const searchRegex = new RegExp(query.trim(), 'i')

    // Search posts by content
    const posts = await postsCollection.find({
      content: { $regex: searchRegex }
    }).sort({ createdAt: -1 }).limit(20).toArray()

    // Format posts for frontend
    const formattedPosts = posts.map(post => ({
      _id: post._id.toString(),
      content: post.content,
      createdAt: post.createdAt,
      author: {
        name: post.author?.name || 'Unknown User',
        email: post.author?.email || '',
        image: post.author?.image || null,
        username: post.author?.username || post.author?.email?.split('@')[0] || 'unknown',
        isVerified: post.author?.isVerified || false
      },
      likes: post.likes || [],
      comments: post.comments || [],
      images: post.images || []
    }))

    return NextResponse.json(formattedPosts)
  } catch (error) {
    console.error('Posts search error:', error)
    return NextResponse.json(
      { error: 'Failed to search posts' },
      { status: 500 }
    )
  }
}