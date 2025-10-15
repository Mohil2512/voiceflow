"use client";

import { useState, useEffect, type MouseEvent as ReactMouseEvent } from 'react'
import { useSession } from 'next-auth/react'
import { Layout } from "@/components/layout/Layout";
import { InlineLoginPrompt } from "@/components/layout/InlineLoginPrompt";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, MessageCircle, UserPlus, Repeat2, Trash2, CheckCheck, Loader2 } from "lucide-react";
import { useRouter } from 'next/navigation';

interface NotificationData {
  _id: string;
  type: 'like' | 'comment' | 'follow' | 'post' | 'repost' | 'comment_like' | 'comment_reply';
  fromUser: {
    name: string;
    email: string;
    username?: string;
    image?: string | null;
  };
  message: string;
  postId?: string;
  commentId?: string;
  createdAt: string;
  read: boolean;
}

function NotificationIcon({ type }: { type: NotificationData['type'] }) {
  const iconClass = "h-4 w-4";
  
  switch (type) {
    case 'like':
      return <Heart className={`${iconClass} text-red-500 fill-red-500`} />;
    case 'comment':
    case 'comment_reply':
      return <MessageCircle className={`${iconClass} text-blue-500`} />;
    case 'follow':
      return <UserPlus className={`${iconClass} text-green-500`} />;
    case 'post':
      return <MessageCircle className={`${iconClass} text-purple-500`} />;
    case 'repost':
      return <Repeat2 className={`${iconClass} text-green-500`} />;
    case 'comment_like':
      return <Heart className={`${iconClass} text-red-500 fill-red-500`} />;
    default:
      return null;
  }
}

function NotificationRow({
  notification,
  onOpen,
  onDelete,
  isDeleting
}: {
  notification: NotificationData;
  onOpen: (notification: NotificationData) => Promise<void> | void;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}) {
  const router = useRouter();

  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (Number.isNaN(diff)) return '';
    if (days > 7) return date.toLocaleDateString();
    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    if (minutes > 0) return `${minutes}m`;
    return 'now';
  };

  const handleClick = async () => {
    try {
      await onOpen(notification);
    } catch (error) {
      console.error('Failed to handle notification open:', error);
    }

    if (notification.postId) {
      router.push(`/?postId=${notification.postId}`);
    } else if (notification.type === 'follow' && notification.fromUser.username) {
      router.push(`/profile/${notification.fromUser.username}`);
    }
  };

  const handleDelete = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onDelete(notification._id);
  };

  return (
    <div
      onClick={handleClick}
      className={`p-4 border-b border-gray-800 hover:bg-gray-900/50 transition-colors cursor-pointer ${!notification.read ? 'bg-gray-900/30' : ''}`}
    >
      <div className="flex items-start space-x-3">
        <div className="relative">
          <Avatar className="h-10 w-10">
            <AvatarImage src={notification.fromUser.image || ''} alt={notification.fromUser.name} />
            <AvatarFallback className="bg-gray-700 text-gray-300">
              {notification.fromUser.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-1 -right-1 bg-black border border-gray-700 rounded-full p-1">
            <NotificationIcon type={notification.type} />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-1 flex-wrap">
            <span className="font-semibold text-white hover:underline">
              {notification.fromUser.name}
            </span>
            {notification.fromUser.username && (
              <span className="text-gray-400 text-sm">@{notification.fromUser.username}</span>
            )}
            <span className="text-gray-500">·</span>
            <span className="text-gray-500 text-sm">{formatTimestamp(notification.createdAt)}</span>
          </div>

          <p className="text-gray-300 text-sm mt-1">
            {notification.message}
          </p>

          {notification.type === 'follow' && (
            <div className="mt-3" onClick={(event) => event.stopPropagation()}>
              <Button
                variant="outline"
                size="sm"
                className="bg-transparent border-gray-600 text-white hover:bg-gray-800"
                onClick={() => router.push(`/profile/${notification.fromUser.username}`)}
              >
                View Profile
              </Button>
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-2 flex-shrink-0 py-1">
          {!notification.read ? (
            <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
          ) : (
            <div className="h-2 w-2"></div>
          )}
          <button
            onClick={handleDelete}
            className="p-1 text-gray-500 hover:text-red-500 transition-colors"
            aria-label="Delete notification"
            type="button"
            disabled={isDeleting}
          >
            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ActivityPage() {
  const { status } = useSession()
  const [mounted, setMounted] = useState(false)
  const [notifications, setNotifications] = useState<NotificationData[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [markingAll, setMarkingAll] = useState(false)
  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (status === 'authenticated') {
      fetchNotifications()
    }
  }, [status])

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/notifications')
      if (response.ok) {
        const data = await response.json()
        if (Array.isArray(data.notifications)) {
          const mapped = (data.notifications as NotificationData[]).map((notification) => ({
            ...notification,
            _id: typeof notification._id === 'string' ? notification._id : String((notification as { _id?: unknown })._id ?? ''),
            read: Boolean(notification.read),
            createdAt: typeof notification.createdAt === 'string'
              ? notification.createdAt
              : new Date(notification.createdAt).toISOString()
          }))
          setNotifications(mapped)
        } else {
          setNotifications([])
        }
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notification: NotificationData) => {
    if (notification.read) return
    
    try {
      const response = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds: [notification._id] })
      })
      if (!response.ok) {
        console.error('Failed to mark notification as read')
      }
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => n._id === notification._id ? { ...n, read: true } : n)
      )
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const handleDeleteNotification = async (id: string) => {
    if (!id) return

    try {
      setDeletingId(id)
      const response = await fetch('/api/notifications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds: [id] })
      })

      if (!response.ok) {
        console.error('Failed to delete notification')
        return
      }

      setNotifications(prev => prev.filter(notification => notification._id !== id))
    } catch (error) {
      console.error('Error deleting notification:', error)
    } finally {
      setDeletingId(current => (current === id ? null : current))
    }
  }

  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return

    try {
      setMarkingAll(true)
      const response = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true })
      })

      if (!response.ok) {
        console.error('Failed to mark all notifications as read')
        return
      }

      setNotifications(prev => prev.map(notification => ({ ...notification, read: true })))
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    } finally {
      setMarkingAll(false)
    }
  }

  if (!mounted) return null

  // Show loading state
  if (status === 'loading' || loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading...</p>
          </div>
        </div>
      </Layout>
    )
  }

  // Show inline login prompt if not authenticated
  if (status === 'unauthenticated') {
    return <InlineLoginPrompt type="notification" />
  }

  return (
    <Layout>
      <div className="flex-1 max-w-2xl mx-auto bg-background text-foreground min-h-screen">
        {/* Header */}
        <div className="sticky top-0 bg-background/95 backdrop-blur-md border-b border-border p-4 z-10">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-foreground">Notifications</h1>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={handleMarkAllRead}
                  disabled={markingAll}
                  className="text-sm"
                >
                  {markingAll ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCheck className="h-4 w-4" />
                  )}
                  <span className="ml-2">Mark all read</span>
                </Button>
              )}
              {unreadCount > 0 && (
                <Badge variant="secondary" className="bg-primary text-primary-foreground">
                  {unreadCount} new
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Notifications List */}
        <div className="mt-0">
          {notifications.length > 0 ? (
            <div className="divide-y divide-gray-800">
              {notifications.map((notification) => (
                <NotificationRow 
                  key={notification._id} 
                  notification={notification}
                  onOpen={markAsRead}
                  onDelete={handleDeleteNotification}
                  isDeleting={deletingId === notification._id}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20">
              <Heart className="h-16 w-16 text-gray-600 mb-4" />
              <h2 className="text-xl font-semibold text-gray-300 mb-2">No notifications yet</h2>
              <p className="text-gray-500 text-center">
                When people interact with your posts or follow you, you&rsquo;ll see it here.
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}