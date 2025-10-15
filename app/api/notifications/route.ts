import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { ObjectId } from 'mongodb'

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

export async function GET() {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Get databases
    const databases = await getDatabases();
    const notificationsCollection = databases.activities.collection('notifications');
    const profilesCollection = databases.profiles.collection('users');
    
    // Get notifications for the current user
    const notifications = await notificationsCollection
      .find({ 
        userEmail: session.user.email 
      })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();
    
    // Get profile information for notification originators
    const enhancedNotifications = await Promise.all(notifications.map(async (notification) => {
      // Get more profile information for the sender if available
      if (notification.fromUser?.email) {
        const senderProfile = await profilesCollection.findOne({ email: notification.fromUser.email });
        if (senderProfile) {
          return {
            ...notification,
            fromUser: {
              ...notification.fromUser,
              username: senderProfile.username || notification.fromUser.email.split('@')[0],
            }
          };
        }
      }
      return {
        ...notification,
        fromUser: {
          ...notification.fromUser,
          username: notification.fromUser?.email?.split('@')[0] || 'user'
        }
      };
    }));

    const normalizedNotifications = enhancedNotifications.map((notification: any) => ({
      ...notification,
      _id: notification._id instanceof ObjectId ? notification._id.toString() : String(notification._id ?? ''),
      createdAt: notification.createdAt instanceof Date ? notification.createdAt.toISOString() : notification.createdAt,
      read: Boolean(notification.read)
    }));
    
    return NextResponse.json({ notifications: normalizedNotifications });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { type, userEmail, postId, read = false } = body;
    
    if (!type || !userEmail) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }
    
    // Get databases
    const databases = await getDatabases();
    const notificationsCollection = databases.activities.collection('notifications');
    
    // Create notification
    const notification = {
      type,
      fromUser: {
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
      },
      userEmail, // The recipient user's email
      postId,   // Optional post ID if the notification is related to a post
      read,
      createdAt: new Date(),
    };
    
    const result = await notificationsCollection.insertOne(notification);
    
    return NextResponse.json({
      message: "Notification created successfully",
      notificationId: result.insertedId,
    });
  } catch (error) {
    console.error("Error creating notification:", error);
    return NextResponse.json(
      { error: "Failed to create notification" },
      { status: 500 }
    );
  }
}

// Mark notifications as read
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const { notificationIds, markAll } = await request.json();
    const databases = await getDatabases();
    const notificationsCollection = databases.activities.collection('notifications');

    // Mark every notification as read for current user
    if (markAll) {
      await notificationsCollection.updateMany(
        { userEmail: session.user.email, read: { $ne: true } },
        { $set: { read: true, updatedAt: new Date() } }
      );
      return NextResponse.json({ success: true });
    }

    if (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0) {
      return NextResponse.json(
        { error: "Invalid notification IDs" },
        { status: 400 }
      );
    }

    const objectIds = notificationIds
      .filter((id: unknown): id is string => typeof id === 'string' && ObjectId.isValid(id))
      .map((id: string) => new ObjectId(id));

    if (objectIds.length === 0) {
      return NextResponse.json(
        { error: "Invalid notification IDs" },
        { status: 400 }
      );
    }
  // Mark notifications as read
    await notificationsCollection.updateMany(
      { 
        _id: { $in: objectIds },
        userEmail: session.user.email // Only update user's own notifications
      },
      { $set: { read: true, updatedAt: new Date() } }
    );
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error marking notifications as read:", error);
    return NextResponse.json(
      { error: "Failed to update notifications" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    let body: unknown = null;
    try {
      body = await request.json();
    } catch {
      body = null;
    }

    const rawIds = Array.isArray((body as { notificationIds?: unknown })?.notificationIds)
      ? (body as { notificationIds: unknown[] }).notificationIds
      : (body as { notificationId?: unknown })?.notificationId
        ? [(body as { notificationId: unknown }).notificationId]
        : [];

    const objectIds = rawIds
      .filter((id): id is string => typeof id === 'string' && ObjectId.isValid(id))
      .map((id) => new ObjectId(id));

    if (objectIds.length === 0) {
      return NextResponse.json(
        { error: "Invalid notification IDs" },
        { status: 400 }
      );
    }

    const databases = await getDatabases();
    const notificationsCollection = databases.activities.collection('notifications');

    const result = await notificationsCollection.deleteMany({
      _id: { $in: objectIds },
      userEmail: session.user.email
    });

    return NextResponse.json({ success: true, deletedCount: result.deletedCount });
  } catch (error) {
    console.error("Error deleting notifications:", error);
    return NextResponse.json(
      { error: "Failed to delete notifications" },
      { status: 500 }
    );
  }
}