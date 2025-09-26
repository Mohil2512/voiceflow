import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

// Import database functions
const getDatabases = async () => {
  try {
    const { getDatabases: getDB } = await import('@/lib/database/mongodb')
    return await getDB();
  } catch (error) {
    console.error('Database connection error:', error);
    throw new Error('Failed to connect to MongoDB Atlas: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get session from the request and check if admin
    const session = await getServerSession()
    
    if (!session?.user?.email) {
      console.error('Authentication failed: No valid session')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // In production, you would add an admin check here
    // For now, we'll allow any authenticated user to run this migration
    
    const databases = await getDatabases()
    const { activities, auth } = databases
    
    // Get all users with their usernames
    const users = await auth.collection('users').find({}).toArray()
    
    // Create a map of userId -> username for quick lookup
    const userIdToUsername = new Map()
    users.forEach(user => {
      userIdToUsername.set(user._id.toString(), user.username)
    })
    
    // Update all posts to include username
    const updateResult = await activities.collection('posts').updateMany(
      { username: { $exists: false } },
      [
        {
          $set: {
            username: {
              $function: {
                body: function(userId) {
                  // This is a placeholder that will be replaced by the actual username lookup
                  // Since we can't use the map inside MongoDB's update operation
                  return "placeholder_username";
                },
                args: ["$userId"],
                lang: "js"
              }
            }
          }
        }
      ]
    )
    
    // Now fetch all posts without username and update them one by one
    // (This is inefficient but necessary because we can't use the map in the MongoDB update)
    const postsWithoutUsername = await activities.collection('posts').find({ 
      username: "placeholder_username" 
    }).toArray()
    
    let updatedCount = 0
    
    for (const post of postsWithoutUsername) {
      const userId = post.userId
      const username = userIdToUsername.get(userId) || post.author?.username || 'unknown_user'
      
      await activities.collection('posts').updateOne(
        { _id: post._id },
        { $set: { username } }
      )
      
      updatedCount++
    }
    
    return NextResponse.json({
      success: true,
      message: "Post schema updated with username field",
      totalPosts: postsWithoutUsername.length,
      updatedCount,
    })
    
  } catch (error) {
    console.error('Error updating post schema:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}