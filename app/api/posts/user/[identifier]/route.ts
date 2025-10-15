import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import type { Document, WithId } from 'mongodb'
import { authOptions } from '../../../auth/[...nextauth]/config'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

// Import database functions
const getDatabases = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error('MongoDB URI environment variable is not set')
  }
  try {
    const { getDatabases: getDB } = await import('@/lib/database/mongodb')
    return await getDB()
  } catch (error) {
    console.error('Database connection error:', error)
    throw new Error('Failed to connect to MongoDB Atlas: ' + (error instanceof Error ? error.message : 'Unknown error'))
  }
}

type ProfileLike = {
  email?: string | null
  name?: string | null
  username?: string | null
  image?: string | null
  isVerified?: boolean | null
}

type AuthorLike = {
  email?: string | null
  name?: string | null
  username?: string | null
  image?: string | null
}

type PostDocument = WithId<Document> & {
  author?: AuthorLike | null
  originalAuthor?: AuthorLike | null
  likedBy?: unknown
  repostedBy?: unknown
  likes?: number
  reposts?: number
  comments?: unknown
  replies?: number
  content?: unknown
  images?: unknown
  createdAt?: Date | string
  timestamp?: string
  originalPostId?: unknown
  isRepost?: unknown
}

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined

const toAuthorLike = (value: unknown): AuthorLike => {
  if (value && typeof value === 'object') {
    const candidate = value as Record<string, unknown>
    return {
      email: asString(candidate.email),
      name: asString(candidate.name),
      username: asString(candidate.username),
      image: asString(candidate.image)
    }
  }
  return {}
}

const buildUserPayload = (
  primaryProfile: ProfileLike | null | undefined,
  fallbackAuthor: AuthorLike | null | undefined
) => {
  const fallbackEmail = asString(fallbackAuthor?.email) ?? ''
  const primaryName = asString(primaryProfile?.name)
  const fallbackName = asString(fallbackAuthor?.name)
  const name = primaryName ?? fallbackName ?? 'Anonymous'
  const username =
    asString(primaryProfile?.username) ??
    asString(fallbackAuthor?.username) ??
    (primaryName ? primaryName.toLowerCase().replace(/\s+/g, '') : undefined) ??
    (fallbackEmail ? fallbackEmail.split('@')[0] : undefined) ??
    'anonymous'
  const image = asString(primaryProfile?.image) ?? asString(fallbackAuthor?.image) ?? ''
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

const normalizeId = (value: unknown) => {
  if (!value) {
    return null
  }
  if (typeof value === 'string') {
    return value
  }
  if (typeof value === 'object' && typeof (value as { toString?: () => string }).toString === 'function') {
    return (value as { toString: () => string }).toString()
  }
  try {
    return String(value)
  } catch {
    return null
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { identifier: string } }
) {
  void _request
  const rawIdentifier = params.identifier

  if (!rawIdentifier) {
    return NextResponse.json(
      { error: 'User identifier parameter is required' },
      { status: 400 }
    )
  }

  try {
    const identifier = decodeURIComponent(rawIdentifier)
    const session = await getServerSession(authOptions)
    const currentUserEmail = session?.user?.email || null

    const { auth, profiles } = await getDatabases()
    const authUsersCollection = auth.collection('user')
    const profilesUsersCollection = profiles.collection('users')

    const postsCollection = profiles.collection('posts')
    let posts: PostDocument[] = []

    // Try to find user in users collection first (check both databases)
    if (!identifier.includes('@')) {
      let profileMatch = await authUsersCollection.findOne({
        username: { $regex: new RegExp(`^${identifier}$`, 'i') }
      })

      // If not in auth, try profiles database
      if (!profileMatch) {
        profileMatch = await profilesUsersCollection.findOne({
          username: { $regex: new RegExp(`^${identifier}$`, 'i') }
        })
      }

      if (profileMatch?.email) {
        // User exists, get posts by email
        posts = (await postsCollection.find({
          'author.email': profileMatch.email,
          $or: [
            { isRepost: { $exists: false } },
            { isRepost: { $ne: true } }
          ]
        })
          .sort({ createdAt: -1 })
          .limit(100)
          .toArray()) as PostDocument[]
      } else {
        // User not in users table, search posts by username directly
        posts = (await postsCollection.find({
          'author.username': { $regex: new RegExp(`^${identifier}$`, 'i') },
          $or: [
            { isRepost: { $exists: false } },
            { isRepost: { $ne: true } }
          ]
        })
          .sort({ createdAt: -1 })
          .limit(100)
          .toArray()) as PostDocument[]
      }
    } else {
      // Identifier is email, search by email
      posts = (await postsCollection.find({
        'author.email': identifier,
        $or: [
          { isRepost: { $exists: false } },
          { isRepost: { $ne: true } }
        ]
      })
        .sort({ createdAt: -1 })
        .limit(100)
        .toArray()) as PostDocument[]
    }

    const relatedEmails = Array.from(
      new Set(
        posts
          .flatMap((post) => [asString(post.author?.email), asString(post.originalAuthor?.email)])
          .filter((email): email is string => Boolean(email))
      )
    )

    // Get profiles from both databases
    let profileDocs: any[] = []
    if (relatedEmails.length > 0) {
      const authProfiles = await authUsersCollection.find({ email: { $in: relatedEmails } }).toArray()
      const profilesProfiles = await profilesUsersCollection.find({ email: { $in: relatedEmails } }).toArray()
      profileDocs = [...authProfiles, ...profilesProfiles]
    }

    const profileMap = new Map<string, ProfileLike>()
    profileDocs.forEach(doc => {
      if (doc && typeof doc === 'object') {
        const record = doc as Record<string, unknown>
        const email = asString(record.email)
        if (email) {
          profileMap.set(email, {
            email,
            name: asString(record.name) ?? null,
            username: asString(record.username) ?? null,
            image: asString(record.image) ?? null,
            isVerified: typeof record.isVerified === 'boolean' ? record.isVerified : null
          })
        }
      }
    })

    const formattedPosts = posts.map((post) => {
      const likedByRaw = Array.isArray(post.likedBy) ? post.likedBy : []
      const repostedByRaw = Array.isArray(post.repostedBy) ? post.repostedBy : []
      const likedBy = likedByRaw.filter((email): email is string => typeof email === 'string')
      const repostedBy = repostedByRaw.filter((email): email is string => typeof email === 'string')
      const likesCount = likedBy.length || (typeof post.likes === 'number' ? post.likes : 0)
      const repostsCount = repostedBy.length || (typeof post.reposts === 'number' ? post.reposts : 0)
      const content = typeof post.content === 'string' ? post.content : ''

      const author = toAuthorLike(post.author)
      const authorProfile = author.email ? profileMap.get(author.email) : null
      const displayUser = buildUserPayload(authorProfile, author)

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
        image: Array.isArray(post.images) && post.images.length > 0 && typeof post.images[0] === 'string'
          ? post.images[0]
          : null,
        images: Array.isArray(post.images)
          ? post.images.filter((img): img is string => typeof img === 'string')
          : [],
        isLiked: currentUserEmail ? likedBy.includes(currentUserEmail) : false,
        isReposted: currentUserEmail ? repostedBy.includes(currentUserEmail) : false,
        canEdit: currentUserEmail ? (currentUserEmail === author.email && !post.isRepost) : false,
        repostContext: null,
        originalPostId: normalizeId(post.originalPostId),
        isRepostEntry: Boolean(post.isRepost)
      }
    })

    return NextResponse.json(formattedPosts)
  } catch (error) {
    console.error('Error fetching user posts from MongoDB Atlas:', error)

    return NextResponse.json(
      {
        error: 'Failed to fetch user posts',
        message: error instanceof Error ? error.message : 'Unknown database error'
      },
      { status: 500 }
    )
  }
}