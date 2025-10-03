"use client";

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Layout } from "@/components/layout/Layout";
import { InlineLoginPrompt } from "@/components/layout/InlineLoginPrompt";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Heart, MessageCircle, UserPlus, AtSign, Repeat2 } from "lucide-react";

interface NotificationItem {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'mention' | 'repost';
  user: {
    name: string;
    username: string;
    avatar: string;
    verified?: boolean;
  };
  content?: string;
  post?: {
    text: string;
    image?: string;
  };
  timestamp: string;
  read: boolean;
}

// Mock notification data - in real app, this would come from API
const mockNotifications: NotificationItem[] = [];

function NotificationIcon({ type }: { type: NotificationItem['type'] }) {
  const iconClass = "h-4 w-4";
  
  switch (type) {
    case 'like':
      return <Heart className={`${iconClass} text-red-500 fill-red-500`} />;
    case 'comment':
      return <MessageCircle className={`${iconClass} text-blue-500`} />;
    case 'follow':
      return <UserPlus className={`${iconClass} text-green-500`} />;
    case 'mention':
      return <AtSign className={`${iconClass} text-purple-500`} />;
    case 'repost':
      return <Repeat2 className={`${iconClass} text-green-500`} />;
    default:
      return null;
  }
}

function NotificationItem({ notification }: { notification: NotificationItem }) {
  const getNotificationText = () => {
    switch (notification.type) {
      case 'like':
        return 'liked your post';
      case 'comment':
        return 'commented on your post';
      case 'follow':
        return 'started following you';
      case 'mention':
        return 'mentioned you in a post';
      case 'repost':
        return 'reposted your post';
      default:
        return '';
    }
  };

  return (
    <div className={`p-4 border-b border-gray-800 hover:bg-gray-900/50 transition-colors ${!notification.read ? 'bg-gray-900/30' : ''}`}>
      <div className="flex items-start space-x-3">
        {/* Avatar with notification icon */}
        <div className="relative">
          <Avatar className="h-10 w-10">
            <AvatarImage src={notification.user.avatar} alt={notification.user.name} />
            <AvatarFallback className="bg-gray-700 text-gray-300">
              {notification.user.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-1 -right-1 bg-black border border-gray-700 rounded-full p-1">
            <NotificationIcon type={notification.type} />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-1">
            <span className="font-semibold text-white hover:underline cursor-pointer">
              {notification.user.name}
            </span>
            {notification.user.verified && (
              <Badge variant="secondary" className="h-4 w-4 p-0 bg-blue-500">
                <span className="text-xs text-white">✓</span>
              </Badge>
            )}
            <span className="text-gray-400 text-sm">@{notification.user.username}</span>
            <span className="text-gray-500">·</span>
            <span className="text-gray-500 text-sm">{notification.timestamp}</span>
          </div>
          
          <p className="text-gray-300 text-sm mt-1">
            {getNotificationText()}
          </p>

          {/* Show comment content if it's a comment */}
          {notification.type === 'comment' && notification.content && (
            <p className="text-gray-400 text-sm mt-2 italic">
              "{notification.content}"
            </p>
          )}

          {/* Show mention content if it's a mention */}
          {notification.type === 'mention' && notification.content && (
            <p className="text-gray-400 text-sm mt-2 italic">
              "{notification.content}"
            </p>
          )}

          {/* Show related post if available */}
          {notification.post && (
            <div className="mt-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
              <p className="text-gray-300 text-sm line-clamp-2">
                {notification.post.text}
              </p>
            </div>
          )}

          {/* Follow button for follow notifications */}
          {notification.type === 'follow' && (
            <div className="mt-3">
              <Button variant="outline" size="sm" className="bg-transparent border-gray-600 text-white hover:bg-gray-800">
                Follow Back
              </Button>
            </div>
          )}
        </div>

        {/* Unread indicator */}
        {!notification.read && (
          <div className="h-2 w-2 bg-blue-500 rounded-full mt-2"></div>
        )}
      </div>
    </div>
  );
}

export default function ActivityPage() {
  const { data: session, status } = useSession()
  const [mounted, setMounted] = useState(false)
  const unreadCount = mockNotifications.filter(n => !n.read).length;

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  // Show loading state
  if (status === 'loading') {
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
            <h1 className="text-xl font-bold text-foreground">Activity</h1>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="bg-primary text-primary-foreground">
                {unreadCount} new
              </Badge>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="w-full bg-transparent border-b border-gray-800 rounded-none h-12 p-0">
            <TabsTrigger 
              value="all" 
              className="flex-1 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-white data-[state=active]:text-white text-gray-400 rounded-none h-full"
            >
              All
            </TabsTrigger>
            <TabsTrigger 
              value="mentions" 
              className="flex-1 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-white data-[state=active]:text-white text-gray-400 rounded-none h-full"
            >
              Mentions
            </TabsTrigger>
            <TabsTrigger 
              value="requests" 
              className="flex-1 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-white data-[state=active]:text-white text-gray-400 rounded-none h-full"
            >
              Requests
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-0">
            {mockNotifications.length > 0 ? (
              <div className="divide-y divide-gray-800">
                {mockNotifications.map((notification) => (
                  <NotificationItem key={notification.id} notification={notification} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20">
                <Heart className="h-16 w-16 text-gray-600 mb-4" />
                <h2 className="text-xl font-semibold text-gray-300 mb-2">No activity yet</h2>
                <p className="text-gray-500 text-center">
                  When people interact with your posts, you'll see it here.
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="mentions" className="mt-0">
            <div className="divide-y divide-gray-800">
              {mockNotifications
                .filter(n => n.type === 'mention')
                .map((notification) => (
                  <NotificationItem key={notification.id} notification={notification} />
                ))}
              {mockNotifications.filter(n => n.type === 'mention').length === 0 && (
                <div className="flex flex-col items-center justify-center py-20">
                  <AtSign className="h-16 w-16 text-gray-600 mb-4" />
                  <h2 className="text-xl font-semibold text-gray-300 mb-2">No mentions yet</h2>
                  <p className="text-gray-500 text-center">
                    When someone mentions you, you'll see it here.
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="requests" className="mt-0">
            <div className="flex flex-col items-center justify-center py-20">
              <UserPlus className="h-16 w-16 text-gray-600 mb-4" />
              <h2 className="text-xl font-semibold text-gray-300 mb-2">No follow requests</h2>
              <p className="text-gray-500 text-center">
                Follow requests will appear here.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}