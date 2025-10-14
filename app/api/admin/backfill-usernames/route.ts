import { NextResponse } from 'next/server'
import { getDatabases } from '@/lib/database/mongodb'

export const dynamic = 'force-dynamic'

// This endpoint backfills username field for existing posts and users
async function backfillUsernames() {
  console.log('🔄 Starting username backfill process...')
  
  const { profiles } = await getDatabases()
  const usersCollection = profiles.collection('users')
  const postsCollection = profiles.collection('posts')

  let usersUpdated = 0
  let postsUpdated = 0
  const userDetails: string[] = []

  // Step 1: Ensure all users have a username field
  console.log('📋 Step 1: Finding users without usernames...')
  const usersWithoutUsername = await usersCollection.find({
    $or: [
      { username: { $exists: false } },
      { username: null },
      { username: '' }
    ]
  }).toArray()

  console.log(`Found ${usersWithoutUsername.length} users without usernames`)

  for (const user of usersWithoutUsername) {
    const email = user.email as string
    const name = user.name as string | undefined
    const username = user.username || name?.toLowerCase().replace(/\s+/g, '') || email.split('@')[0]
    
    console.log(`  ✏️  Setting username for ${email} -> ${username}`)
    
    await usersCollection.updateOne(
      { _id: user._id },
      { $set: { username } }
    )
    usersUpdated++
    userDetails.push(`${email} -> ${username}`)
  }

  // Step 2: Backfill username in all posts
  console.log('📋 Step 2: Updating posts with usernames...')
  const allPosts = await postsCollection.find({}).toArray()
  console.log(`Found ${allPosts.length} posts to check`)

  for (const post of allPosts) {
    const author = post.author as { email?: string; name?: string; username?: string } | undefined
    
    if (!author?.email) {
      console.log(`  ⚠️  Skipping post ${post._id} - no author email`)
      continue
    }

    // Check if already has username
    if (author.username) {
      console.log(`  ✓ Post ${post._id} already has username: ${author.username}`)
      continue
    }

    // Find the user profile
    const userProfile = await usersCollection.findOne({ email: author.email })
    
    if (userProfile) {
      const username = userProfile.username as string | undefined || 
                      userProfile.name?.toString().toLowerCase().replace(/\s+/g, '') || 
                      author.email.split('@')[0]

      console.log(`  ✏️  Updating post ${post._id} author username -> ${username}`)

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
    } else {
      console.log(`  ⚠️  No user profile found for ${author.email}`)
    }
  }

  console.log('✅ Backfill completed!')
  
  return {
    success: true,
    message: 'Username backfill completed',
    stats: {
      usersUpdated,
      postsUpdated,
      totalUsers: usersWithoutUsername.length,
      totalPosts: allPosts.length
    },
    userDetails
  }
}

export async function GET() {
  try {
    const result = await backfillUsernames()
    return NextResponse.json(result)
  } catch (error) {
    console.error('❌ Error backfilling usernames:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { 
        error: 'Failed to backfill usernames',
        details: message
      },
      { status: 500 }
    )
  }
}

export async function POST() {
  try {
    const result = await backfillUsernames()
    return NextResponse.json(result)
  } catch (error) {
    console.error('❌ Error backfilling usernames:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { 
        error: 'Failed to backfill usernames',
        details: message
      },
      { status: 500 }
    )
  }
}
