import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../auth/[...nextauth]/config'

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

const buildUserPayload = (primaryProfile: any, fallbackAuthor: any) => {
  const fallbackEmail = fallbackAuthor?.email || ''
  const name = primaryProfile?.name || fallbackAuthor?.name || 'Anonymous'
  const username = primaryProfile?.username ||
    fallbackAuthor?.username ||
    primaryProfile?.name?.toLowerCase()?.replace(/\s+/g, '') ||
    fallbackEmail.split('@')[0] ||
    'anonymous'
  const image = primaryProfile?.image || fallbackAuthor?.image || ''
  const verified = Boolean(primaryProfile?.isVerified)

  return {
    name,
    username,
    avatar: image,
    image,
    email: fallbackEmail,
    verified
  }
}

const normalizeId = (value: any) => {
  if (!value) {
    return null
  }
  if (typeof value === 'string') {
    return value
  }
  if (typeof value === 'object' && typeof value.toString === 'function') {
    return value.toString()
  }
  try {
    return String(value)
  } catch (error) {
    return null
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { identifier: string } }
) {
  try {
    const rawIdentifier = params.identifier

    if (!rawIdentifier) {
      return NextResponse.json({ error: 'Identifier parameter is required' }, { status: 400 })
    }

    const identifier = decodeURIComponent(rawIdentifier)
    const session = await getServerSession(authOptions)
    const currentUserEmail = session?.user?.email || null

    const databases = await getDatabases()
    const profilesDb = databases.profiles

    const usersCollection = profilesDb.collection('users')

    let userEmail = identifier
    if (!identifier.includes('@')) {
      const profileMatch = await usersCollection.findOne({
        username: { $regex: new RegExp(`^${identifier}$`, 'i') }
      })

      if (profileMatch?.email) {
        userEmail = profileMatch.email
      }
    }

    if (!userEmail) {
      return NextResponse.json([])
    }

    const postsCollection = profilesDb.collection('posts')
    const repostDocs = await postsCollection.find({
      isRepost: true,
      'author.email': userEmail
    })
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray()

    const relatedEmails = Array.from(new Set(
      repostDocs.flatMap(post => [post.author?.email, post.originalAuthor?.email]).filter(Boolean) as string[]
    ))

    const profileDocs = relatedEmails.length > 0
      ? await usersCollection.find({ email: { $in: relatedEmails } }).toArray()
      : []

    const profileMap = new Map<string, any>()
    profileDocs.forEach(doc => {
      if (doc?.email) {
        profileMap.set(doc.email, doc)
      }
    })

    const formattedReposts = repostDocs.map(post => {
      const likedBy = Array.isArray(post.likedBy) ? post.likedBy : []
      const repostedBy = Array.isArray(post.repostedBy) ? post.repostedBy : []
      const likesCount = likedBy.length || (typeof post.likes === 'number' ? post.likes : 0)
      const repostsCount = repostedBy.length || (typeof post.reposts === 'number' ? post.reposts : 0)
      const content = typeof post.content === 'string' ? post.content : ''

      const originalAuthorProfile = post.originalAuthor?.email ? profileMap.get(post.originalAuthor.email) : null
      const reposterProfile = post.author?.email ? profileMap.get(post.author.email) : null

      const displayUser = buildUserPayload(originalAuthorProfile, post.originalAuthor || post.author)
      const repostContext = buildUserPayload(reposterProfile, post.author)

      const timestamp = (() => {
        if (post.createdAt) {
          const date = new Date(post.createdAt)
          return isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString()
        }
        if (post.timestamp) {
          const date = new Date(post.timestamp)
          return isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString()
        }
        return new Date().toISOString()
      })()

      return {
        id: post._id.toString(),
        user: displayUser,
        content,
        timestamp,
        likes: likesCount,
        replies: Array.isArray(post.comments) ? post.comments.length : (post.replies || 0),
        reposts: repostsCount,
        image: Array.isArray(post.images) && post.images.length > 0 ? post.images[0] : null,
        images: Array.isArray(post.images) ? post.images : [],
        isLiked: currentUserEmail ? likedBy.includes(currentUserEmail) : false,
        isReposted: currentUserEmail ? repostedBy.includes(currentUserEmail) : false,
        canEdit: false,
        repostContext,
        originalPostId: normalizeId(post.originalPostId),
        isRepostEntry: true
      }
    })

    return NextResponse.json(formattedReposts)

  } catch (error) {
    console.error('Error fetching user reposts:', error)
    return NextResponse.json({ error: 'Failed to fetch reposts' }, { status: 500 })
  }
}