import { NextResponse } from 'next/server'
import { getDatabases } from '@/lib/database/mongodb'

export const dynamic = 'force-dynamic'

// This endpoint backfills username field for existing posts and users
export async function POST() {
  try {
    const { profiles } = await getDatabases()
    const usersCollection = profiles.collection('users')
    const postsCollection = profiles.collection('posts')

    let usersUpdated = 0
    let postsUpdated = 0

    // Step 1: Ensure all users have a username field
    const usersWithoutUsername = await usersCollection.find({
      $or: [
        { username: { $exists: false } },
        { username: null },
        { username: '' }
      ]
    }).toArray()

    for (const user of usersWithoutUsername) {
      const email = user.email as string
      const name = user.name as string | undefined
      const username = user.username || name?.toLowerCase().replace(/\s+/g, '') || email.split('@')[0]
      
      await usersCollection.updateOne(
        { _id: user._id },
        { $set: { username } }
      )
      usersUpdated++
    }

    // Step 2: Backfill username in all posts
    const allPosts = await postsCollection.find({}).toArray()

    for (const post of allPosts) {
      const author = post.author as { email?: string; name?: string; username?: string } | undefined
      
      if (!author?.email) continue

      // Find the user profile
      const userProfile = await usersCollection.findOne({ email: author.email })
      
      if (userProfile) {
        const username = userProfile.username as string | undefined || 
                        userProfile.name?.toString().toLowerCase().replace(/\s+/g, '') || 
                        author.email.split('@')[0]

        // Update the post's author username
        await postsCollection.updateOne(
          { _id: post._id },
          { 
            $set: { 
              'author.username': username 
            } 
          }
        )
        postsUpdated++
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Username backfill completed',
      stats: {
        usersUpdated,
        postsUpdated
      }
    })
  } catch (error) {
    console.error('Error backfilling usernames:', error)
    return NextResponse.json(
      { error: 'Failed to backfill usernames' },
      { status: 500 }
    )
  }
}
