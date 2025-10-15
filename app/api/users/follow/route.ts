import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import type { UpdateFilter, Document } from 'mongodb'
import { authOptions } from '../../auth/[...nextauth]/config'
import { getDatabases } from '@/lib/database/mongodb'
import { createNotification } from '@/lib/notifications'

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const rawTargetUsername = typeof body?.targetUsername === 'string' ? body.targetUsername : ''
    const action = body?.action as string | undefined
    const normalizedTargetUsername = rawTargetUsername.replace(/^@/, '').trim()

    console.log('[Follow API] Request:', { targetUsername: rawTargetUsername, action, currentUser: session.user.email })

    if (!normalizedTargetUsername || !action) {
      return NextResponse.json(
        { error: 'Target username and action are required' },
        { status: 400 }
      )
    }

    if (action !== 'follow' && action !== 'unfollow') {
      return NextResponse.json(
        { error: 'Action must be either "follow" or "unfollow"' },
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

    const usernameRegex = new RegExp(`^${escapeRegex(normalizedTargetUsername)}$`, 'i')

    let targetUser = await usersCollection.findOne({
      username: { $regex: usernameRegex }
    })

    if (!targetUser && normalizedTargetUsername.includes('@')) {
      const targetEmailRegex = new RegExp(`^${escapeRegex(normalizedTargetUsername)}$`, 'i')
      targetUser = await usersCollection.findOne({
        email: targetEmailRegex
      })
    }

    if (!targetUser) {
      const authEmailRegex = normalizedTargetUsername.includes('@')
        ? new RegExp(`^${escapeRegex(normalizedTargetUsername)}$`, 'i')
        : null

      const authOrFilters: Record<string, unknown>[] = [
        { username: { $regex: usernameRegex } }
      ]

      if (authEmailRegex) {
        authOrFilters.push({ email: authEmailRegex })
      }

      const authUser = await authUsersCollection.findOne({
        $or: authOrFilters
      })

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

      if (normalizedTargetUsername.includes('@')) {
        postOrFilters.push({ 'author.email': new RegExp(`^${escapeRegex(normalizedTargetUsername)}$`, 'i') })
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

    console.log('[Follow API] Target user found:', targetUser ? { email: targetUser.email, username: targetUser.username || 'NO_USERNAME' } : 'NOT FOUND')

    if (!targetUser?.email) {
      return NextResponse.json(
        { error: `Target user @${rawTargetUsername || normalizedTargetUsername} not found` },
        { status: 404 }
      )
    }

    // Can't follow yourself
    if (session.user.email.toLowerCase() === targetUser.email.toLowerCase()) {
      return NextResponse.json(
        { error: 'Cannot follow yourself' },
        { status: 400 }
      )
    }

    const sessionUser = session.user as typeof session.user & { username?: string }
    const currentUserRecord = await ensureProfileUser(session.user.email, {
      name: sessionUser.name || undefined,
      username:
        (typeof sessionUser.username === 'string' && sessionUser.username.trim().length > 0
          ? sessionUser.username
          : sessionUser.email?.split('@')[0]) || undefined,
      image: sessionUser.image || undefined
    })

    const currentUserEmailForFilter = typeof currentUserRecord?.email === 'string'
      ? currentUserRecord.email
      : session.user.email

    const targetUserEmailForFilter = typeof targetUser.email === 'string'
      ? targetUser.email
      : normalizedTargetUsername

    const normalizedCurrentUserEmail = currentUserEmailForFilter.toLowerCase()
    const normalizedTargetUserEmail = targetUserEmailForFilter.toLowerCase()

    const buildEmailFilter = (email: string) => ({
      email: { $regex: new RegExp(`^${escapeRegex(email)}$`, 'i') }
    })

    if (action === 'follow') {
      // Add target to current user's following list
      await usersCollection.updateOne(
        buildEmailFilter(currentUserEmailForFilter),
        { $addToSet: { following: normalizedTargetUserEmail } }
      )

      // Add current user to target's followers list
      await usersCollection.updateOne(
        buildEmailFilter(targetUserEmailForFilter),
        { $addToSet: { followers: normalizedCurrentUserEmail } }
      )

      // Get current user details for notification
      const currentUser = currentUserRecord ?? (await usersCollection.findOne(buildEmailFilter(currentUserEmailForFilter)))

      const followerDisplayName =
        currentUser?.name ||
        sessionUser.name ||
        currentUser?.username ||
        normalizedCurrentUserEmail.split('@')[0]

      const followerUsername =
        currentUser?.username ||
        (typeof sessionUser.username === 'string' && sessionUser.username.trim().length > 0
          ? sessionUser.username.trim().toLowerCase()
          : normalizedCurrentUserEmail.split('@')[0])

      const currentUserAvatar =
        currentUser && typeof (currentUser as Record<string, unknown>).avatar === 'string'
          ? ((currentUser as Record<string, unknown>).avatar as string)
          : undefined

      const followerImage =
        (typeof currentUser?.image === 'string' ? currentUser.image : undefined) ??
        currentUserAvatar ??
        (typeof sessionUser.image === 'string' ? sessionUser.image : undefined)

      // Create notification for the followed user
      await createNotification({
        type: 'follow',
        fromUser: {
          email: normalizedCurrentUserEmail,
          name: followerDisplayName,
          username: followerUsername,
          image: followerImage
        },
        toUserEmail: normalizedTargetUserEmail,
        message: `${followerDisplayName} started following you`
      })
    } else {
      // Remove target from current user's following list
      await usersCollection.updateOne(
        buildEmailFilter(currentUserEmailForFilter),
        { $pull: { following: { $in: [normalizedTargetUserEmail, targetUserEmailForFilter] } } } as unknown as UpdateFilter<Document>
      )

      // Remove current user from target's followers list
      await usersCollection.updateOne(
        buildEmailFilter(targetUserEmailForFilter),
        { $pull: { followers: { $in: [normalizedCurrentUserEmail, currentUserEmailForFilter] } } } as unknown as UpdateFilter<Document>
      )
    }

    // Get updated follower/following counts
    const updatedTargetUser = await usersCollection.findOne(buildEmailFilter(targetUserEmailForFilter))

    const followers = Array.isArray(updatedTargetUser?.followers) 
      ? updatedTargetUser.followers.length 
      : 0
    
    const following = Array.isArray(updatedTargetUser?.following) 
      ? updatedTargetUser.following.length 
      : 0

    return NextResponse.json({
      success: true,
      isFollowing: action === 'follow',
      stats: {
        followers,
        following
      }
    })
  } catch (error) {
    console.error('Error updating follow status:', error)
    return NextResponse.json(
      { error: 'Failed to update follow status' },
      { status: 500 }
    )
  }
}