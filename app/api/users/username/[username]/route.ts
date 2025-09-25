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
    
    // First, try to find user by exact username
    user = await auth.collection<UserDocument>('users').findOne({ username })
    
    // If not found, try lowercase username for case-insensitive match
    if (!user) {
      user = await auth.collection<UserDocument>('users').findOne({ 
        username: { $regex: new RegExp(`^${username}$`, 'i') } 
      })
    }
    
    // If still not found, try by email prefix
    if (!user) {
      const emailPrefix = username.toLowerCase()
      user = await auth.collection<UserDocument>('users').findOne({
        email: { $regex: new RegExp(`^${emailPrefix}@`, 'i') }
      })
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