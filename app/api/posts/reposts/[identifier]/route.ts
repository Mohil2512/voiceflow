import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import type { Document, WithId } from 'mongodb'
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
  if (typeof value === 'object' && typeof value.toString === 'function') {
    return value.toString()
  }
  try {
    return String(value)
  } catch {
    return null
  }
}

export async function GET(
  _context: unknown,
  { params }: { params: { identifier: string } }
) {
  void _context
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
    const repostDocs = (await postsCollection.find({
      isRepost: true,
      'author.email': userEmail
    })
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray()) as PostDocument[]

    const relatedEmails = Array.from(
      new Set(
        repostDocs
          .flatMap((post) => [asString(post.author?.email), asString(post.originalAuthor?.email)])
          .filter((email): email is string => Boolean(email))
      )
    )

    const profileDocs = relatedEmails.length > 0
      ? await usersCollection.find({ email: { $in: relatedEmails } }).toArray()
      : []

    const profileMap = new Map<string, ProfileLike>()
    profileDocs.forEach((doc) => {
      if (doc && typeof doc === 'object') {
        const raw = doc as Record<string, unknown>
        const email = asString(raw.email)
        if (email) {
          profileMap.set(email, {
            email,
            name: asString(raw.name) ?? null,
            username: asString(raw.username) ?? null,
            image: asString(raw.image) ?? null,
            isVerified: typeof raw.isVerified === 'boolean' ? raw.isVerified : null
          })
        }
      }
    })

    const formattedReposts = repostDocs.map(post => {
      const likedByRaw = Array.isArray(post.likedBy) ? post.likedBy : []
      const repostedByRaw = Array.isArray(post.repostedBy) ? post.repostedBy : []
      const likedBy = likedByRaw.filter((email): email is string => typeof email === 'string')
      const repostedBy = repostedByRaw.filter((email): email is string => typeof email === 'string')
      const likesCount = likedBy.length || (typeof post.likes === 'number' ? post.likes : 0)
      const repostsCount = repostedBy.length || (typeof post.reposts === 'number' ? post.reposts : 0)
      const content = typeof post.content === 'string' ? post.content : ''

      const originalAuthor = toAuthorLike(post.originalAuthor)
      const reposterAuthor = toAuthorLike(post.author)
      const originalAuthorProfile = originalAuthor.email ? profileMap.get(originalAuthor.email) : null
      const reposterProfile = reposterAuthor.email ? profileMap.get(reposterAuthor.email) : null

      const displayUser = buildUserPayload(originalAuthorProfile, Object.keys(originalAuthor).length ? originalAuthor : reposterAuthor)
      const repostContext = buildUserPayload(reposterProfile, reposterAuthor)

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