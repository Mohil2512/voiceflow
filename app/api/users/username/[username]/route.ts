import { NextRequest, NextResponse } from 'next/server'
import { getDatabases } from '@/lib/database/mongodb'

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    const rawUsername = params.username

    if (!rawUsername) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      )
    }

    const normalizedUsername = rawUsername.replace(/^@/, '').trim()

    if (!normalizedUsername) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      )
    }

    console.log('[Username API] Lookup request:', normalizedUsername)

    const { auth, profiles } = await getDatabases()

    const authUsersCollection = auth.collection('user')
    const usersCollection = profiles.collection('users')
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

    const usernameRegex = new RegExp(`^${escapeRegex(normalizedUsername)}$`, 'i')

    const buildUserResponse = (record: Record<string, unknown>, fallbackFollowers = 0, fallbackFollowing = 0) => {
      const followersRaw = record.followers
      const followingRaw = record.following

      const followersCount = Array.isArray(followersRaw)
        ? followersRaw.length
        : typeof followersRaw === 'number'
          ? followersRaw
          : fallbackFollowers

      const followingCount = Array.isArray(followingRaw)
        ? followingRaw.length
        : typeof followingRaw === 'number'
          ? followingRaw
          : fallbackFollowing

      return {
        id: typeof record._id !== 'undefined' ? String(record._id) : `${record.email || normalizedUsername}-ghost`,
        name: typeof record.name === 'string' ? record.name : (typeof record.username === 'string' ? record.username : null),
        username: typeof record.username === 'string' && record.username.trim().length > 0
          ? record.username
          : (typeof record.email === 'string' && record.email.includes('@')
            ? record.email.split('@')[0]
            : normalizedUsername),
        email: typeof record.email === 'string' ? record.email : null,
        avatar: typeof record.image === 'string' ? record.image
          : (typeof record.avatar === 'string' ? record.avatar : null),
        image: typeof record.image === 'string' ? record.image
          : (typeof record.avatar === 'string' ? record.avatar : null),
        verified: Boolean(record.isVerified),
        bio: typeof record.bio === 'string' ? record.bio : null,
        location: typeof record.location === 'string' ? record.location : null,
        website: typeof record.website === 'string' ? record.website : null,
        createdAt: record.createdAt instanceof Date ? record.createdAt : new Date(),
        followers: followersCount,
        following: followingCount
      }
    }

    let userRecord = await usersCollection.findOne({ username: { $regex: usernameRegex } })

    if (!userRecord && normalizedUsername.includes('@')) {
      userRecord = await usersCollection.findOne({ email: { $regex: usernameRegex } })
    }

    if (!userRecord) {
      const authUser = await authUsersCollection.findOne({
        $or: [
          { username: { $regex: usernameRegex } },
          { email: normalizedUsername.includes('@') ? { $regex: usernameRegex } : undefined }
        ].filter(Boolean) as Record<string, unknown>[]
      })

      if (authUser?.email) {
        userRecord = await ensureProfileUser(authUser.email, {
          name: typeof authUser.name === 'string' ? authUser.name : undefined,
          username: typeof authUser.username === 'string' && authUser.username.trim().length > 0
            ? authUser.username
            : undefined,
          image: typeof authUser.image === 'string' ? authUser.image
            : (typeof authUser.avatar === 'string' ? authUser.avatar : undefined)
        })
      }
    }

    if (!userRecord) {
      const postOrFilters: Record<string, unknown>[] = [
        { 'author.username': { $regex: usernameRegex } }
      ]

      if (normalizedUsername.includes('@')) {
        postOrFilters.push({ 'author.email': { $regex: usernameRegex } })
      }

      postOrFilters.push({ 'author.name': { $regex: usernameRegex } })

      const postDoc = await postsCollection.findOne(
        { $or: postOrFilters },
        { sort: { createdAt: -1 }, projection: { author: 1, followers: 1, following: 1 } }
      )

      const authorCandidate = postDoc && typeof postDoc === 'object'
        ? (postDoc as Record<string, unknown>).author
        : null

      if (authorCandidate && typeof authorCandidate === 'object') {
        const authorRecord = authorCandidate as Record<string, unknown>
        const authorEmail = typeof authorRecord.email === 'string' && authorRecord.email.trim().length > 0
          ? authorRecord.email.trim()
          : undefined

        if (authorEmail) {
          userRecord = await ensureProfileUser(authorEmail, {
            name: typeof authorRecord.name === 'string' ? authorRecord.name : undefined,
            username: typeof authorRecord.username === 'string' && authorRecord.username.trim().length > 0
              ? authorRecord.username
              : undefined,
            image: typeof authorRecord.image === 'string' ? authorRecord.image : undefined
          })
        } else {
          userRecord = {
            _id: normalizedUsername,
            name: typeof authorRecord.name === 'string' ? authorRecord.name : normalizedUsername,
            username: typeof authorRecord.username === 'string' && authorRecord.username.trim().length > 0
              ? authorRecord.username
              : normalizedUsername,
            email: null,
            image: typeof authorRecord.image === 'string' ? authorRecord.image : null,
            avatar: typeof authorRecord.image === 'string' ? authorRecord.image : null,
            followers: 0,
            following: 0,
            createdAt: new Date()
          }
        }
      }
    }

    if (!userRecord) {
      console.log('[Username API] No record found for:', normalizedUsername)
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const responsePayload = buildUserResponse(userRecord as Record<string, unknown>)

    console.log('[Username API] Returning profile for:', responsePayload.username)

    return NextResponse.json({ user: responsePayload })
  } catch (error) {
    console.error('[Username API] Failed:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    )
  }
}