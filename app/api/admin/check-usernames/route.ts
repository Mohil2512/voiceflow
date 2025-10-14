import { NextResponse } from 'next/server'
import { getDatabases } from '@/lib/database/mongodb'

export const dynamic = 'force-dynamic'

// This endpoint checks and reports on username data in the database
export async function GET() {
  try {
    console.log('🔍 Checking username data...')
    
    const { profiles } = await getDatabases()
    const usersCollection = profiles.collection('users')
    const postsCollection = profiles.collection('posts')

    // Check users
    const totalUsers = await usersCollection.countDocuments()
    const usersWithUsername = await usersCollection.countDocuments({
      username: { $exists: true, $ne: null, $ne: '' }
    })
    const usersWithoutUsername = await usersCollection.countDocuments({
      $or: [
        { username: { $exists: false } },
        { username: null },
        { username: '' }
      ]
    })

    // Get sample users
    const sampleUsers = await usersCollection.find({}).limit(5).toArray()
    const userSamples = sampleUsers.map(u => ({
      email: u.email,
      name: u.name,
      username: u.username
    }))

    // Check posts
    const totalPosts = await postsCollection.countDocuments()
    const postsWithUsername = await postsCollection.countDocuments({
      'author.username': { $exists: true, $ne: null, $ne: '' }
    })
    const postsWithoutUsername = await postsCollection.countDocuments({
      $or: [
        { 'author.username': { $exists: false } },
        { 'author.username': null },
        { 'author.username': '' }
      ]
    })

    // Get sample posts
    const samplePosts = await postsCollection.find({}).limit(5).toArray()
    const postSamples = samplePosts.map(p => ({
      _id: p._id.toString(),
      authorEmail: p.author?.email,
      authorUsername: p.author?.username
    }))

    const report = {
      users: {
        total: totalUsers,
        withUsername: usersWithUsername,
        withoutUsername: usersWithoutUsername,
        samples: userSamples
      },
      posts: {
        total: totalPosts,
        withUsername: postsWithUsername,
        withoutUsername: postsWithoutUsername,
        samples: postSamples
      }
    }

    console.log('Report:', JSON.stringify(report, null, 2))

    return NextResponse.json(report)
  } catch (error) {
    console.error('Error checking username data:', error)
    return NextResponse.json(
      { 
        error: 'Failed to check username data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
