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
    
    // Update all comments to include username field
    const updateResult = await activities.collection('comments').updateMany(
      { username: { $exists: false } },
      [
        {
          $set: {
            username: {
              $function: {
                body: function(userId) {
                  // This is a placeholder that will be replaced by the actual username lookup
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
    
    // Now fetch all comments with placeholder username and update them one by one
    const commentsWithoutUsername = await activities.collection('comments').find({ 
      username: "placeholder_username" 
    }).toArray()
    
    let updatedCount = 0
    
    for (const comment of commentsWithoutUsername) {
      const userId = comment.userId
      const username = userIdToUsername.get(userId) || 'unknown_user'
      
      await activities.collection('comments').updateOne(
        { _id: comment._id },
        { $set: { username } }
      )
      
      updatedCount++
    }
    
    return NextResponse.json({
      success: true,
      message: "Comment schema updated with username field",
      totalComments: commentsWithoutUsername.length,
      updatedCount,
    })
    
  } catch (error) {
    console.error('Error updating comment schema:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}