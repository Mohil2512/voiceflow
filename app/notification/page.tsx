"use client";

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Layout } from "@/components/layout/Layout";
import { InlineLoginPrompt } from "@/components/layout/InlineLoginPrompt";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, MessageCircle, UserPlus, Repeat2 } from "lucide-react";
import { useRouter } from 'next/navigation';

interface NotificationItem {
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

function NotificationIcon({ type }: { type: NotificationItem['type'] }) {
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

function NotificationItem({ notification, onClick }: { notification: NotificationItem; onClick: (notification: NotificationItem) => void }) {
  const router = useRouter();
  
  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 7) return date.toLocaleDateString();
    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    if (minutes > 0) return `${minutes}m`;
    return 'now';
  };

  const handleClick = () => {
    onClick(notification);
    // Navigate to post if postId exists
    if (notification.postId) {
      router.push(`/?postId=${notification.postId}`);
    } else if (notification.type === 'follow' && notification.fromUser.username) {
      router.push(`/profile/${notification.fromUser.username}`);
    }
  };

  return (
    <div 
      onClick={handleClick}
      className={`p-4 border-b border-gray-800 hover:bg-gray-900/50 transition-colors cursor-pointer ${!notification.read ? 'bg-gray-900/30' : ''}`}
    >
      <div className="flex items-start space-x-3">
        {/* Avatar with notification icon */}
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

        {/* Content */}
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

          {/* Follow button for follow notifications */}
          {notification.type === 'follow' && (
            <div className="mt-3" onClick={(e) => e.stopPropagation()}>
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

        {/* Unread indicator */}
        {!notification.read && (
          <div className="h-2 w-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
        )}
      </div>
    </div>
  );
}

export default function ActivityPage() {
  const { status } = useSession()
  const [mounted, setMounted] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
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
        setNotifications(data.notifications || [])
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notification: NotificationItem) => {
    if (notification.read) return
    
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds: [notification._id] })
      })
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => n._id === notification._id ? { ...n, read: true } : n)
      )
    } catch (error) {
      console.error('Error marking notification as read:', error)
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
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-foreground">Notifications</h1>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="bg-primary text-primary-foreground">
                {unreadCount} new
              </Badge>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <div className="mt-0">
          {notifications.length > 0 ? (
            <div className="divide-y divide-gray-800">
              {notifications.map((notification) => (
                <NotificationItem 
                  key={notification._id} 
                  notification={notification}
                  onClick={markAsRead}
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