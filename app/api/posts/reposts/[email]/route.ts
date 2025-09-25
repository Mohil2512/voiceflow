import { NextRequest, NextResponse } from 'next/server'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

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
    const activitiesDb = databases.activities
    
    // Get user's profile to check for reposted posts IDs
    const profilesDb = databases.profiles
    const userProfile = await profilesDb.collection('profiles').findOne({ email: decodeURIComponent(email) })
    
    // Fetch user reposts (posts that were explicitly marked as reposts by this user)
    const reposts = await activitiesDb.collection('posts')
      .find({ 
        'author.email': decodeURIComponent(email),
        isRepost: true
      })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray()

    // Also fetch posts that have been marked with repostedBy containing the user's email
    const repostedPosts = await activitiesDb.collection('posts')
      .find({ 
        repostedBy: decodeURIComponent(email) 
      })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray()
    
    // Combine and deduplicate
    const allReposts = [...reposts, ...repostedPosts]
    
    // Remove duplicates based on originalPostId or _id
    const uniqueRepostIds = new Set()
    const uniqueReposts = allReposts.filter(post => {
      const idToCheck = post.originalPostId || post._id.toString()
      if (uniqueRepostIds.has(idToCheck)) {
        return false
      }
      uniqueRepostIds.add(idToCheck)
      return true
    })

    // Sort by creation date
    uniqueReposts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    // Log raw posts before formatting
    console.log('Raw reposts found:', uniqueReposts.length);
    
    // Convert MongoDB documents to plain objects
    const formattedReposts = uniqueReposts.map(post => ({
      id: post._id.toString(),
      _id: post._id.toString(), // Include both id formats to ensure compatibility
      content: post.content || '',
      location: post.location || null,
      images: post.images || [],
      user: {
        name: post.author?.name || post.originalAuthor?.name || 'Unknown',
        username: (post.author?.email || post.originalAuthor?.email || 'anonymous').split('@')[0],
        avatar: post.author?.image || post.originalAuthor?.image || '/placeholder.svg',
        verified: post.author?.verified || post.originalAuthor?.verified || false,
      },
      createdAt: post.createdAt,
      timestamp: formatTimeAgo(post.createdAt),
      likes: post.likes || 0,
      replies: post.replies || 0,
      reposts: post.reposts || 0,
      isRepost: true,
      isReposted: true, // Ensure this flag is set
      originalPostId: post.originalPostId,
      repostedBy: {
        name: post.author?.name || 'Unknown',
        username: (post.author?.email || 'anonymous').split('@')[0],
        avatar: post.author?.image || '/placeholder.svg',
      },
      // Use the first image from the images array if available
      image: post.images && post.images.length > 0 
        ? `data:${post.images[0].type};base64,${post.images[0].data}` 
        : null,
    }))

    console.log('API returning formatted reposts:', formattedReposts.length, 'items');
    
    // Debug sample of the first repost if available
    if (formattedReposts.length > 0) {
      console.log('Sample first repost:', JSON.stringify(formattedReposts[0]));
    }
    
    return NextResponse.json({ reposts: formattedReposts })

  } catch (error) {
    console.error('Error fetching user reposts:', error)
    return NextResponse.json({ error: 'Failed to fetch reposts' }, { status: 500 })
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