"use client"

import { useState, useEffect } from 'react';
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

interface Notification {
  id: string;
  type: 'follow_request' | 'follow_accepted' | 'new_follower' | 'new_post';
  fromUser: {
    name: string;
    username: string;
    avatar?: string;
  };
  createdAt: string;
  read: boolean;
}

export default function Notification() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [mounted, setMounted] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Set mounted state
  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle authentication check
  useEffect(() => {
    if (status === 'unauthenticated') {
      console.log("Notification page: User not authenticated, redirecting to sign in");
      localStorage.setItem('redirectAfterLogin', '/notification');
      router.push('/auth/signin?callbackUrl=/notification');
    }
  }, [status, router]);

  // Fetch notifications when authenticated
  useEffect(() => {
    const fetchNotifications = async () => {
      if (session?.user) {
        setIsLoading(true);
        try {
          // Mock API call - replace with your actual API endpoint
          // const response = await fetch('/api/notifications');
          
          // Mock data for demonstration
          const mockData = [
            {
              id: '1',
              type: 'follow_request' as const,
              fromUser: {
                name: 'John Doe',
                username: 'johndoe',
                avatar: 'https://ui.shadcn.com/avatars/01.png',
              },
              createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 minutes ago
              read: false,
            },
            {
              id: '2',
              type: 'new_post' as const,
              fromUser: {
                name: 'Jane Smith',
                username: 'janesmith',
                avatar: 'https://ui.shadcn.com/avatars/02.png',
              },
              createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
              read: true,
            },
            {
              id: '3',
              type: 'new_follower' as const,
              fromUser: {
                name: 'Alex Johnson',
                username: 'alexj',
              },
              createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
              read: true,
            },
          ];
          
          // Simulate API delay
          setTimeout(() => {
            setNotifications(mockData);
            setIsLoading(false);
          }, 800);
          
        } catch (error) {
          console.error('Error fetching notifications:', error);
          setNotifications([]);
          setIsLoading(false);
        }
      }
    };

    fetchNotifications();
  }, [session]);

  // Helper functions
  const getNotificationText = (notification: Notification) => {
    switch (notification.type) {
      case 'follow_request':
        return 'requested to follow you';
      case 'follow_accepted':
        return 'accepted your follow request';
      case 'new_follower':
        return 'started following you';
      case 'new_post':
        return 'published a new post';
      default:
        return 'sent you a notification';
    }
  };

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds}s`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
    
    return date.toLocaleDateString();
  };

  // Loading state
  if (status === 'loading' || !mounted) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto py-8">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
          </div>
        </div>
      </Layout>
    );
  }

  // Handle unauthenticated state
  if (status === 'unauthenticated') {
    return null; // We're redirecting in useEffect, so return nothing here
  }

  // Main render for authenticated users
  return (
    <Layout>
      <div className="max-w-2xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">Notifications</h1>
        
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-xl font-semibold text-muted-foreground">No notifications yet</p>
            <p className="text-muted-foreground mt-2">When you get notifications, they'll show up here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map(notification => (
              <Card key={notification.id} className={notification.read ? '' : 'border-primary'}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar>
                      <AvatarImage src={notification.fromUser.avatar || ''} alt={notification.fromUser.name} />
                      <AvatarFallback>
                        {notification.fromUser.name?.charAt(0).toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div>
                      <div className="flex items-center gap-2">
                        <span 
                          onClick={() => router.push(`/profile/${notification.fromUser.username}`)}
                          className="font-medium text-foreground hover:underline cursor-pointer"
                        >
                          {notification.fromUser.name}
                        </span>
                        <span className="text-muted-foreground text-sm">
                          {getRelativeTime(notification.createdAt)}
                        </span>
                        {!notification.read && (
                          <span className="h-2 w-2 rounded-full bg-primary"></span>
                        )}
                      </div>
                      
                      <p className="text-foreground">{getNotificationText(notification)}</p>
                      
                      {notification.type === 'follow_request' && (
                        <div className="flex gap-2 mt-2">
                          <button className="px-4 py-1 bg-primary text-primary-foreground rounded-full text-sm">
                            Accept
                          </button>
                          <button className="px-4 py-1 bg-muted text-foreground rounded-full text-sm">
                            Decline
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}