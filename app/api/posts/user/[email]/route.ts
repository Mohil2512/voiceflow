import { NextRequest, NextResponse } from 'next/server'

// Conditional import of database functions
const getDatabases = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error('Database not available')
  }
  const { getDatabases: getDB } = await import('@/lib/database/mongodb')
  return getDB()
}

export async function GET(
  request: NextRequest,
  { params }: { params: { email: string } }
) {
  try {
    const { email } = params
    
    if (!email) {
      return NextResponse.json({ error: 'Email parameter is required' }, { status: 400 })
    }

    const databases = await getDatabases()
    const postsDb = databases.activities

    // Fetch user posts from the database
    const posts = await postsDb.collection('posts')
      .find({ 'author.email': decodeURIComponent(email) })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray()

    // Convert MongoDB documents to plain objects
    const formattedPosts = posts.map(post => ({
      id: post._id.toString(),
      content: post.content || '',
      location: post.location || null,
      images: post.images || [],
      author: {
        name: post.author?.name || 'Unknown',
        email: post.author?.email || '',
        image: post.author?.image || '/placeholder.svg'
      },
      createdAt: post.createdAt,
      timestamp: formatTimeAgo(post.createdAt),
      likes: post.likes || 0,
      replies: post.replies || 0,
      reposts: post.reposts || 0
    }))

    return NextResponse.json({ posts: formattedPosts })

  } catch (error) {
    console.error('Error fetching user posts:', error)
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 })
  }
}

function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) return `${diffInSeconds}s`
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d`
  return `${Math.floor(diffInSeconds / 2592000)}mo`
}