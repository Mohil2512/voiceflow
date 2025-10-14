import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import type { Document, WithId } from 'mongodb'
import { authOptions } from '../auth/[...nextauth]/config'
import { getDatabases } from '@/lib/database/mongodb'

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

export const dynamic = 'force-dynamic'

export async function GET(_request: Request) {
  void _request
  try {
    console.log('GET /api/posts - Fetching posts...')
    
    const session = await getServerSession(authOptions)
    const currentUserEmail = session?.user?.email || null

  const { profiles } = await getDatabases()
  const posts = (await profiles.collection('posts').find({}).sort({ createdAt: -1 }).toArray()) as PostDocument[]
    
    console.log(`Found ${posts.length} posts`)
    
    // Get unique user emails to fetch current profile data
    const userEmails = Array.from(
      new Set(
        posts
          .flatMap((post) => [asString(post.author?.email), asString(post.originalAuthor?.email)])
          .filter((email): email is string => Boolean(email))
      )
    )
    const usersCollection = profiles.collection('users')
    const userProfiles = await usersCollection.find({ 
      email: { $in: userEmails } 
    }).toArray()
    
    // Create a map for quick lookup
    const userProfileMap = new Map<string, ProfileLike>()
    userProfiles.forEach(user => {
      if (user && typeof user === 'object') {
        const record = user as Record<string, unknown>
        const email = asString(record.email)
        if (email) {
          userProfileMap.set(email, {
            email,
            name: asString(record.name) ?? null,
            username: asString(record.username) ?? null,
            image: asString(record.image) ?? null,
            isVerified: typeof record.isVerified === 'boolean' ? record.isVerified : null
          })
        }
      }
    })
    
    // Transform posts to match PostCard component expectations
    const transformedPosts = posts.map(post => {
      const likedByRaw = Array.isArray(post.likedBy) ? post.likedBy : []
      const repostedByRaw = Array.isArray(post.repostedBy) ? post.repostedBy : []
      const likedBy = likedByRaw.filter((email): email is string => typeof email === 'string')
      const repostedBy = repostedByRaw.filter((email): email is string => typeof email === 'string')
      const likesCount = likedBy.length || (typeof post.likes === 'number' ? post.likes : 0)
      const repostsCount = repostedBy.length || (typeof post.reposts === 'number' ? post.reposts : 0)
      const content = typeof post.content === 'string' ? post.content : ''

      const isRepostEntry = Boolean(post.isRepost)
      const baseAuthor = toAuthorLike(isRepostEntry && post.originalAuthor ? post.originalAuthor : post.author)
      const baseProfile = baseAuthor.email ? userProfileMap.get(baseAuthor.email) : undefined
      const reposterAuthor = toAuthorLike(post.author)
      const reposterProfile = isRepostEntry && reposterAuthor.email ? userProfileMap.get(reposterAuthor.email) : undefined

      const displayUser = buildUserPayload(baseProfile, baseAuthor)
      const reposterContext = isRepostEntry
        ? buildUserPayload(reposterProfile, reposterAuthor)
        : null

      const canEdit = currentUserEmail
        ? currentUserEmail === reposterAuthor.email && !isRepostEntry
        : false

      return {
        id: post._id.toString(),
        user: displayUser,
        content,
        timestamp: (() => {
          if (post.createdAt) {
            const date = new Date(post.createdAt)
            return isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString()
          }
          if (post.timestamp) {
            const date = new Date(post.timestamp)
            return isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString()
          }
          return new Date().toISOString()
        })(),
        likes: likesCount,
        replies: Array.isArray(post.comments) ? post.comments.length : (post.replies || 0),
        reposts: repostsCount,
        image: Array.isArray(post.images) && post.images.length > 0 && typeof post.images[0] === 'string'
          ? post.images[0]
          : null,
        images: Array.isArray(post.images)
          ? post.images.filter((img): img is string => typeof img === 'string')
          : [], // Include the full images array
        isLiked: currentUserEmail ? likedBy.includes(currentUserEmail) : false,
        isReposted: currentUserEmail ? repostedBy.includes(currentUserEmail) : false,
        canEdit,
        repostContext: reposterContext,
        originalPostId: normalizeId(post.originalPostId),
        isRepostEntry
      }
    })
    
    // Log the transformed posts to debug image display issues
    console.log('🔍 Transformed posts for frontend:')
    transformedPosts.forEach((post, index) => {
      console.log(`  Post ${index + 1}:`)
      console.log(`    ID: ${post.id}`)
      console.log(`    Content: ${post.content.substring(0, 50)}...`)
      console.log(`    Images array: [${post.images.length} items]`, post.images)
      console.log(`    Single image: ${post.image}`)
    })
    
    return NextResponse.json(transformedPosts)
  } catch (error) {
    console.error('Error fetching posts:', error)
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('POST /api/posts - Creating post...')
    
    // Get user session first
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    const body = await request.json()
    const { content, images = [] } = body

    if ((!content || content.trim().length === 0) && (!images || images.length === 0)) {
      return NextResponse.json(
        { error: 'Add text or at least one image before posting.' },
        { status: 400 }
      )
    }
    
    const { profiles } = await getDatabases()
    
    // Get user profile data
    const userProfile = await profiles.collection('users').findOne({ email: session.user.email })
    
    const newPost = {
      timestamp: new Date().toISOString(),
      createdAt: new Date(),
      author: {
        id: session.user.id || session.user.email,
        name: userProfile?.name || session.user.name || 'User',
        email: session.user.email,
        username: userProfile?.username || session.user.name?.toLowerCase().replace(/\s+/g, '') || session.user.email.split('@')[0],
        image: userProfile?.image || session.user.image || ''
      },
      content: (content || '').trim(),
      images: images || [],
      likedBy: [],
      comments: [],
      repostedBy: []
    }
    
    console.log('Creating post with author data:', newPost.author)
    
    const result = await profiles.collection('posts').insertOne(newPost)
    console.log('Post created with ID:', result.insertedId)
    
    return NextResponse.json({ 
      success: true, 
      postId: result.insertedId,
      message: 'Post created successfully' 
    })
  } catch (error) {
    console.error('Error creating post:', error)
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 })
  }
}
