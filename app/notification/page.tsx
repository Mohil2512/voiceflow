"use client"

// Import statement moved to top and organized for better readability
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Layout } from "@/components/layout/Layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Link from 'next/link'
// Add dynamic import for client-side only code
import dynamic from 'next/dynamic'

interface Notification {
  id: string;
  type: 'follow_request' | 'follow_accepted' | 'new_follower' | 'new_post';
  fromUser: {
    name: string;
    username: string;
    avatar?: string;
    email?: string;
  };
  createdAt: string;
  read: boolean;
}

export default function NotificationPage() {
  // Get session client-side only
  const { data: session, status } = useSession()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Effect for mounting state
  useEffect(() => {
    setMounted(true)
  }, [])

  // Authentication redirect effect
  useEffect(() => {
    if (status === 'unauthenticated') {
      console.log("Notification page: User not authenticated, redirecting to sign in");
      // Use safe localStorage access
      if (typeof window !== 'undefined') {
        localStorage.setItem('redirectAfterLogin', '/notification');
      }
      router.push('/auth/signin?callbackUrl=/notification');
    }
  }, [status, router]);

  // Fetch notifications when the component mounts
  useEffect(() => {
    const fetchNotifications = async () => {
      if (session?.user) {
        setIsLoading(true)
        try {
          // Replace with your actual API endpoint
          const response = await fetch('/api/notifications')
          
          if (response.ok) {
            const data = await response.json()
            setNotifications(data.notifications || [])
          } else {
            console.error('Failed to fetch notifications:', response.status)
            
            // For demo, show placeholder notifications if API fails
            setNotifications([
              {
                id: '1',
                type: 'new_follower',
                fromUser: {
                  name: 'John Doe',
                  username: 'johndoe',
                  avatar: '/placeholder.svg'
                },
                createdAt: '2025-09-24T12:00:00Z',
                read: false
              },
              {
                id: '2',
                type: 'follow_request',
                fromUser: {
                  name: 'Jane Smith',
                  username: 'janesmith',
                  avatar: '/placeholder.svg'
                },
                createdAt: '2025-09-23T14:30:00Z',
                read: true
              },
              {
                id: '3',
                type: 'new_post',
                fromUser: {
                  name: 'Alex Johnson',
                  username: 'alexj',
                  avatar: '/placeholder.svg'
                },
                createdAt: '2025-09-22T09:15:00Z',
                read: false
              }
            ])
          }
        } catch (error) {
          console.error('Error fetching notifications:', error)
        } finally {
          setIsLoading(false)
        }
      }
    }

    if (session?.user) {
      fetchNotifications()
    }
  }, [session])

  const getNotificationText = (notification: Notification) => {
    switch (notification.type) {
      case 'follow_request':
        return `${notification.fromUser.name} has requested to follow you`;
      case 'follow_accepted':
        return `${notification.fromUser.name} has accepted your follow request`;
      case 'new_follower':
        return `${notification.fromUser.name} is now following you`;
      case 'new_post':
        return `${notification.fromUser.name} has posted something new`;
      default:
        return `New notification from ${notification.fromUser.name}`;
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

  if (status === 'loading' || !mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    // We're handling redirection in the useEffect, just return null here
    return null;
  }

  return (
    <Layout>
      <div className="flex-1 max-w-2xl mx-auto bg-background text-foreground min-h-screen">
        <div className="sticky top-0 bg-background/90 backdrop-blur-md border-b border-border p-4 z-10">
          <h1 className="text-xl font-bold text-foreground">Notifications</h1>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <p className="text-muted-foreground">No notifications yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              When someone follows you or mentions you, you'll see it here
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {notifications.map(notification => (
              <div 
                key={notification.id} 
                className={`p-4 flex gap-3 hover:bg-accent/30 transition-colors ${!notification.read ? 'bg-accent/10' : ''}`}
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage 
                    src={notification.fromUser.avatar || '/placeholder.svg'} 
                    alt={notification.fromUser.name} 
                  />
                  <AvatarFallback>
                    {notification.fromUser.name[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div>
                  <div className="flex items-center gap-2">
                    <span 
                      onClick={() => {
                        // Check if this is the current user's notification
                        if (session?.user?.username === notification.fromUser.username) {
                          router.push('/profile');
                        } else {
                          router.push(`/profile/${notification.fromUser.username || ''}`);
                        }
                      }}
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
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}