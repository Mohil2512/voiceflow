import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../auth/[...nextauth]/config'
import { getDatabases } from '@/lib/database/mongodb'

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const rawUsername = searchParams.get('username')

    if (!rawUsername) {
      return NextResponse.json(
        { error: 'Username parameter is required' },
        { status: 400 }
      )
    }

    const normalizedUsername = rawUsername.replace(/^@/, '').trim()

    if (!normalizedUsername) {
      return NextResponse.json(
        { error: 'Username parameter is required' },
        { status: 400 }
      )
    }

    const { profiles, auth } = await getDatabases()
  const usersCollection = profiles.collection('users')
  const authUsersCollection = auth.collection('user')
  const postsCollection = profiles.collection('posts')

    const ensureProfileUser = async (
      email: string,
      fallback: { name?: string; username?: string; image?: string } = {}
    ) => {
      const trimmedEmail = email.trim()
      const normalizedEmail = trimmedEmail.toLowerCase()
      const emailRegex = new RegExp(`^${escapeRegex(trimmedEmail)}$`, 'i')
      const existingUser = await usersCollection.findOne({ email: emailRegex })
      const targetEmail = typeof existingUser?.email === 'string' ? existingUser.email : normalizedEmail
      const now = new Date()
      const setOnInsert: Record<string, unknown> = {
        email: normalizedEmail,
        followers: [],
        following: [],
        createdAt: now
      }
      const set: Record<string, unknown> = { updatedAt: now }

      if (fallback.name) {
        set.name = fallback.name
      }
      if (fallback.username) {
        set.username = fallback.username.trim().toLowerCase()
      }
      if (fallback.image) {
        set.image = fallback.image
        set.avatar = fallback.image
      }

      const result = await usersCollection.findOneAndUpdate(
        { email: targetEmail },
        {
          $setOnInsert: setOnInsert,
          $set: set
        },
        { upsert: true, returnDocument: 'after' }
      )

      if (result && result.value) {
        return result.value
      }

      return usersCollection.findOne({ email: emailRegex })
    }

    const buildEmailFilter = (email: string) => ({
      email: { $regex: new RegExp(`^${escapeRegex(email)}$`, 'i') }
    })

    // Find the target user by username
    const usernameRegex = new RegExp(`^${escapeRegex(normalizedUsername)}$`, 'i')
    let targetUser = await usersCollection.findOne({
      username: { $regex: usernameRegex }
    })

    if (!targetUser && normalizedUsername.includes('@')) {
      const targetEmailRegex = new RegExp(`^${escapeRegex(normalizedUsername)}$`, 'i')
      targetUser = await usersCollection.findOne({ email: targetEmailRegex })
    }

    if (!targetUser) {
      const authEmailRegex = normalizedUsername.includes('@')
        ? new RegExp(`^${escapeRegex(normalizedUsername)}$`, 'i')
        : null

      const authOrFilters: Record<string, unknown>[] = [{ username: { $regex: usernameRegex } }]
      if (authEmailRegex) {
        authOrFilters.push({ email: authEmailRegex })
      }

      const authUser = await authUsersCollection.findOne({ $or: authOrFilters })

      if (authUser?.email) {
        const fallbackUsername = typeof authUser.username === 'string' && authUser.username.trim().length > 0
          ? authUser.username
          : (typeof authUser.email === 'string' && authUser.email.includes('@')
            ? authUser.email.split('@')[0]
            : undefined)

        const fallbackName = typeof authUser.name === 'string' && authUser.name.trim().length > 0
          ? authUser.name
          : fallbackUsername

        const fallbackImage = typeof authUser.image === 'string' && authUser.image.trim().length > 0
          ? authUser.image
          : (typeof authUser.avatar === 'string' && authUser.avatar.trim().length > 0
            ? authUser.avatar
            : undefined)

        targetUser = await ensureProfileUser(authUser.email, {
          name: fallbackName || undefined,
          username: fallbackUsername || undefined,
          image: fallbackImage
        })
      }
    }

    if (!targetUser) {
      const postOrFilters: Record<string, unknown>[] = [
        { 'author.username': { $regex: usernameRegex } }
      ]

      if (normalizedUsername.includes('@')) {
        postOrFilters.push({ 'author.email': new RegExp(`^${escapeRegex(normalizedUsername)}$`, 'i') })
      }

      const postDoc = await postsCollection.findOne(
        { $or: postOrFilters },
        { sort: { createdAt: -1 }, projection: { author: 1 } }
      )

      const authorCandidate = postDoc && typeof postDoc === 'object' && postDoc !== null
        ? (postDoc as Record<string, unknown>).author
        : null

      if (authorCandidate && typeof authorCandidate === 'object') {
        const authorRecord = authorCandidate as Record<string, unknown>
        const authorEmail = typeof authorRecord.email === 'string' && authorRecord.email.trim().length > 0
          ? authorRecord.email.trim()
          : undefined

        if (authorEmail) {
          const fallbackUsername = typeof authorRecord.username === 'string' && authorRecord.username.trim().length > 0
            ? authorRecord.username
            : undefined

          const fallbackName = typeof authorRecord.name === 'string' && authorRecord.name.trim().length > 0
            ? authorRecord.name
            : fallbackUsername

          const fallbackImage = typeof authorRecord.image === 'string' && authorRecord.image.trim().length > 0
            ? authorRecord.image
            : undefined

          targetUser = await ensureProfileUser(authorEmail, {
            name: fallbackName || undefined,
            username: fallbackUsername || undefined,
            image: fallbackImage
          })
        }
      }
    }

    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    if (typeof targetUser.email !== 'string' || !targetUser.email) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const targetUserEmail = targetUser.email
    const normalizedTargetEmail = targetUserEmail.toLowerCase()

    const sessionUser = session.user as typeof session.user & { username?: string }
    const currentUserRecord = await ensureProfileUser(session.user.email, {
      name: sessionUser.name || undefined,
      username:
        (typeof sessionUser.username === 'string' && sessionUser.username.trim().length > 0
          ? sessionUser.username
          : sessionUser.email?.split('@')[0]) || undefined,
      image: sessionUser.image || undefined
    })

    const currentUser = currentUserRecord ?? (await usersCollection.findOne(buildEmailFilter(session.user.email)))

    // Check if viewing own profile
    const isSelf = session.user.email.toLowerCase() === normalizedTargetEmail

    // Check if current user is following the target user
    const followingList = Array.isArray(currentUser?.following)
      ? currentUser.following
      : []

    const normalizedFollowing = new Set(
      followingList
        .filter((email): email is string => typeof email === 'string')
        .map(email => email.toLowerCase())
    )

    const isFollowing = normalizedTargetEmail ? normalizedFollowing.has(normalizedTargetEmail) : false

    // Get follower and following counts
    const followers = Array.isArray(targetUser.followers)
      ? targetUser.followers.length
      : 0

    const following = Array.isArray(targetUser.following)
      ? targetUser.following.length
      : 0

    return NextResponse.json({
      isFollowing,
      isSelf,
      stats: {
        followers,
        following
      }
    })
  } catch (error) {
    console.error('Error checking follow status:', error)
    return NextResponse.json(
      { error: 'Failed to check follow status' },
      { status: 500 }
    )
  }
}