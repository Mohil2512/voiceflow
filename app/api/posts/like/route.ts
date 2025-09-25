import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

// Define auth options like in the post/create route
const authOptions = {
  secret: process.env.NEXTAUTH_SECRET,
}

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

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const data = await req.json()
    const { postId, liked } = data

    if (!postId) {
      return NextResponse.json(
        { error: 'Post ID is required' },
        { status: 400 }
      )
    }

    // Get databases
    const databases = await getDatabases()
    const postsCollection = databases.activities.collection('posts')
    const profilesCollection = databases.profiles.collection('profiles')
    const notificationsCollection = databases.activities.collection('notifications')

    // Get the post to update
    const post = await postsCollection.findOne({ _id: postId })
    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      )
    }

    // Get the current user's profile
    const userProfile = await profilesCollection.findOne({
      email: session.user.email
    })

    if (!userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Update the likes count on the post
    if (liked) {
      // Add the like
      await postsCollection.updateOne(
        { _id: postId },
        { $inc: { likes: 1 } }
      )
      
      // Add user to likedBy array
      await postsCollection.updateOne(
        { _id: postId },
        { $addToSet: { likedBy: session.user.email } }
      )
    } else {
      // Remove the like
      await postsCollection.updateOne(
        { _id: postId },
        { $inc: { likes: -1 } }
      )
      
      // Remove user from likedBy array - use $set to replace the array
      const post = await postsCollection.findOne({ _id: postId })
      if (post && post.likedBy && Array.isArray(post.likedBy)) {
        const updatedLikedBy = post.likedBy.filter(email => email !== session.user.email)
        await postsCollection.updateOne(
          { _id: postId },
          { $set: { likedBy: updatedLikedBy } }
        )
      }
    }

    // Update the user's liked posts
    if (liked) {
      await profilesCollection.updateOne(
        { email: session.user.email },
        { $addToSet: { likedPosts: postId } }
      )

      // Create notification for the post owner if not the same user
      if (post.author?.email !== session.user.email) {
        const notification = {
          userEmail: post.author.email,
          type: 'like',
          fromUser: {
            email: session.user.email,
            name: session.user.name,
            image: session.user.image
          },
          postId: postId,
          read: false,
          createdAt: new Date()
        }

        await notificationsCollection.insertOne(notification)
      }
    } else {
      // Get user profile and update the likedPosts array using $set
      const profile = await profilesCollection.findOne({ email: session.user.email })
      if (profile && profile.likedPosts && Array.isArray(profile.likedPosts)) {
        const updatedLikedPosts = profile.likedPosts.filter(id => id !== postId)
        await profilesCollection.updateOne(
          { email: session.user.email },
          { $set: { likedPosts: updatedLikedPosts } }
        )
      }
    }

    return NextResponse.json(
      { success: true, liked: liked },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error handling post like:', error)
    return NextResponse.json(
      { error: 'Failed to update post like status' },
      { status: 500 }
    )
  }
}