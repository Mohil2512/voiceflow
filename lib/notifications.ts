import { getDatabases } from '@/lib/database/mongodb'

interface NotificationData {
  type: 'follow' | 'post' | 'like' | 'comment' | 'repost' | 'comment_like' | 'comment_reply'
  fromUser: {
    email: string
    name: string
    username?: string
    image?: string | null
  }
  toUserEmail: string
  postId?: string
  commentId?: string
  message: string
}

export async function createNotification(data: NotificationData) {
  try {
    const { activities } = await getDatabases()
    const notificationsCollection = activities.collection('notifications')

    // Don't create notification if user is notifying themselves
    if (data.fromUser.email === data.toUserEmail) {
      return
    }

    await notificationsCollection.insertOne({
      type: data.type,
      fromUser: data.fromUser,
      userEmail: data.toUserEmail,
      postId: data.postId,
      commentId: data.commentId,
      message: data.message,
      read: false,
      createdAt: new Date()
    })
  } catch (error) {
    console.error('Error creating notification:', error)
  }
}
