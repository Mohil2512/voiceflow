import { NextRequest, NextResponse } from 'next/server'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

// Import database functions
const getDatabases = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error('MongoDB URI environment variable is not set')
  }
  try {
    const { getDatabases: getDB } = await import('@/lib/database/mongodb')
    return await getDB()
  } catch (error) {
    console.error('Database connection error:', error)
    throw new Error('Failed to connect to MongoDB Atlas: ' + (error instanceof Error ? error.message : 'Unknown error'))
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  const username = params.username
  
  if (!username) {
    return NextResponse.json(
      { error: 'Username parameter is required' },
      { status: 400 }
    )
  }
  
  try {
    // Connect to database - MongoDB Atlas
    const { auth, profiles } = await getDatabases()
    
    // Define user document interface
    interface UserDocument {
      _id: { toString(): string };
      email: string;
      username: string;
      name?: string;
      image?: string;
      [key: string]: any; // Allow other properties
    }
    
    // Search by multiple ways to find the user
    let user: UserDocument | null = null
    
    // Debug info
    console.log(`Looking up user with username: "${username}"`);
    
    // First, try to find user by exact username
    user = await auth.collection<UserDocument>('users').findOne({ username })
    
    // If not found, try lowercase username for case-insensitive match
    if (!user) {
      try {
        // Use safe regex pattern with escaping special characters
        const escapedUsername = username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        user = await auth.collection<UserDocument>('users').findOne({ 
          username: { $regex: new RegExp(`^${escapedUsername}$`, 'i') } 
        })
      } catch (error) {
        console.error('Error in regex search:', error);
        // Continue to next search method
      }
    }
    
    // Try additional query strategies if user still not found
    if (!user) {
      // Look up by normalized username (replace spaces with underscores)
      const normalizedUsername = username.replace(/\s+/g, '_');
      user = await auth.collection<UserDocument>('users').findOne({ 
        username: normalizedUsername 
      })
    }
    
    // If still not found, try by email prefix
    if (!user) {
      try {
        const emailPrefix = username.toLowerCase()
        const safeEmailPrefix = emailPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        user = await auth.collection<UserDocument>('users').findOne({
          email: { $regex: new RegExp(`^${safeEmailPrefix}@`, 'i') }
        })
      } catch (error) {
        console.error('Error in email regex search:', error);
      }
    }
    
    // Final fallback: Try a fuzzy search based on any portion of the username
    if (!user) {
      try {
        // Try to find any username that contains this string
        // This is a last resort and might not be accurate
        const fuzzyUsername = username.trim().toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        if (fuzzyUsername.length > 2) { // Only try if we have at least 3 characters
          user = await auth.collection<UserDocument>('users').findOne({
            username: { $regex: new RegExp(fuzzyUsername, 'i') }
          })
          
          if (user) {
            console.log(`Found user via fuzzy match: ${user.username}`);
          }
        }
      } catch (error) {
        console.error('Error in fuzzy username search:', error);
      }
    }
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }
    
    // Get additional profile information if available
    const profile = await profiles.collection('userProfiles').findOne({
      userId: user._id.toString()
    })
    
    // Merge user and profile data
    const userData = {
      ...user,
      _id: user._id.toString(),
      profile: profile ? {
        ...profile,
        _id: profile._id.toString()
      } : null
    }
    
    return NextResponse.json({ user: userData })
  } catch (error) {
    console.error('Error fetching user data from MongoDB Atlas:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch user data',
        message: error instanceof Error ? error.message : 'Unknown database error'
      },
      { status: 500 }
    )
  }
}