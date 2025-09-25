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
    const { postId, reposted } = data

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

    // Update the reposts count on the post
    if (reposted) {
      // Increment reposts count
      await postsCollection.updateOne(
        { _id: postId },
        { $inc: { reposts: 1 } }
      )
      
      // Add user to repostedBy array
      await postsCollection.updateOne(
        { _id: postId },
        { $addToSet: { repostedBy: session.user.email } }
      )

      // Also create a repost entry in the posts collection
      const repostData = {
        originalPostId: postId,
        originalAuthor: post.author,
        content: post.content,
        images: post.images,
        isRepost: true,
        author: {
          name: session.user.name,
          email: session.user.email,
          image: session.user.image
        },
        createdAt: new Date(),
        likes: 0,
        replies: 0,
        reposts: 0
      }

      const insertResult = await postsCollection.insertOne(repostData)
      console.log('Created repost entry with ID:', insertResult.insertedId);

      // Update user's reposted posts
      const updateResult = await profilesCollection.updateOne(
        { email: session.user.email },
        { $addToSet: { repostedPosts: postId } }
      )
      console.log('Updated profile repostedPosts array, matched:', updateResult.matchedCount, 'modified:', updateResult.modifiedCount);

      // Create notification for the post owner if not the same user
      if (post.author?.email !== session.user.email) {
        const notification = {
          userEmail: post.author.email,
          type: 'repost',
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
      // Remove the repost - decrement count
      await postsCollection.updateOne(
        { _id: postId },
        { $inc: { reposts: -1 } }
      )
      
      // Remove user from repostedBy array using $set
      const post = await postsCollection.findOne({ _id: postId })
      if (post && post.repostedBy && Array.isArray(post.repostedBy)) {
        const updatedRepostedBy = post.repostedBy.filter(email => email !== session.user.email)
        await postsCollection.updateOne(
          { _id: postId },
          { $set: { repostedBy: updatedRepostedBy } }
        )
      }

      // Delete the repost entry
      await postsCollection.deleteOne({ 
        originalPostId: postId,
        'author.email': session.user.email,
        isRepost: true
      })

      // Update user's reposted posts using $set
      const profile = await profilesCollection.findOne({ email: session.user.email })
      if (profile && profile.repostedPosts && Array.isArray(profile.repostedPosts)) {
        const updatedRepostedPosts = profile.repostedPosts.filter(id => id !== postId)
        await profilesCollection.updateOne(
          { email: session.user.email },
          { $set: { repostedPosts: updatedRepostedPosts } }
        )
      }
    }

    return NextResponse.json(
      { 
        success: true, 
        reposted: reposted,
        postId: postId, 
        userEmail: session.user.email,
        message: reposted ? 'Post has been reposted' : 'Repost has been removed'
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error handling post repost:', error)
    return NextResponse.json(
      { error: 'Failed to update post repost status' },
      { status: 500 }
    )
  }
}