import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/config'
import { getDatabases } from '@/lib/database/mongodb'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    console.log('GET /api/posts - Fetching posts...')
    
    const { profiles } = await getDatabases()
    const posts = await profiles.collection('posts').find({}).sort({ createdAt: -1 }).toArray()
    
    console.log(`Found ${posts.length} posts`)
    
    // Get unique user emails to fetch current profile data
    const userEmails = Array.from(new Set(posts.map(post => post.author?.email).filter(Boolean)))
    const usersCollection = profiles.collection('users')
    const userProfiles = await usersCollection.find({ 
      email: { $in: userEmails } 
    }).toArray()
    
    // Create a map for quick lookup
    const userProfileMap = new Map()
    userProfiles.forEach(user => {
      userProfileMap.set(user.email, user)
    })
    
    // Transform posts to match PostCard component expectations
    const transformedPosts = posts.map(post => {
      const userProfile = userProfileMap.get(post.author?.email)
      
      console.log(`🔍 Profile lookup for ${post.author?.email}:`, {
        hasProfile: !!userProfile,
        profileUsername: userProfile?.username,
        profileName: userProfile?.name,
        postAuthorEmail: post.author?.email
      })
      
      // Better username fallback logic
      const displayUsername = userProfile?.username || 
                             post.author?.username || 
                             userProfile?.name?.toLowerCase().replace(/\s+/g, '') ||
                             post.author?.email?.split('@')[0] || 
                             'anonymous'
      
      return {
        id: post._id.toString(),
        user: {
          name: userProfile?.name || post.author?.name || 'Anonymous',
          username: displayUsername,
          avatar: userProfile?.image || post.author?.image || '',
          image: userProfile?.image || post.author?.image || '',
          email: post.author?.email || '',
          verified: userProfile?.isVerified || false
        },
        content: post.content,
        timestamp: (() => {
          if (post.createdAt) {
            const date = new Date(post.createdAt)
            return isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString()
          }
          if (post.timestamp) {
            const date = new Date(post.timestamp)
            return isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString()
          }
          return new Date().toISOString()
        })(),
        likes: post.likes || 0,
        replies: post.replies || 0,
        reposts: post.reposts || 0,
        image: post.images && post.images.length > 0 ? post.images[0] : null,
        images: post.images || [], // Include the full images array
        isLiked: false,
        isReposted: false
      }
    })
    
    // Log the transformed posts to debug image display issues
    console.log('🔍 Transformed posts for frontend:')
    transformedPosts.forEach((post, index) => {
      console.log(`  Post ${index + 1}:`)
      console.log(`    ID: ${post.id}`)
      console.log(`    Content: ${post.content.substring(0, 50)}...`)
      console.log(`    Images array: [${post.images.length} items]`, post.images)
      console.log(`    Single image: ${post.image}`)
    })
    
    return NextResponse.json(transformedPosts)
  } catch (error) {
    console.error('Error fetching posts:', error)
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('POST /api/posts - Creating post...')
    
    // Get user session first
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    const body = await request.json()
    const { content, images = [] } = body

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Post content is required' },
        { status: 400 }
      )
    }
    
    const { profiles } = await getDatabases()
    
    // Get user profile data
    const userProfile = await profiles.collection('users').findOne({ email: session.user.email })
    
    const newPost = {
      content: content.trim(),
      timestamp: new Date().toISOString(),
      createdAt: new Date(),
      author: {
        id: session.user.id || session.user.email,
        name: userProfile?.name || session.user.name || 'User',
        email: session.user.email,
        username: userProfile?.username || session.user.name?.toLowerCase().replace(/\s+/g, '') || session.user.email.split('@')[0],
        image: userProfile?.image || session.user.image || ''
      },
      images: images || [],
      likes: [],
      comments: [],
      reposts: []
    }
    
    console.log('Creating post with author data:', newPost.author)
    
    const result = await profiles.collection('posts').insertOne(newPost)
    console.log('Post created with ID:', result.insertedId)
    
    return NextResponse.json({ 
      success: true, 
      postId: result.insertedId,
      message: 'Post created successfully' 
    })
  } catch (error) {
    console.error('Error creating post:', error)
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 })
  }
}
