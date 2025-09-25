"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { Heart, MessageCircle, Repeat2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Link from "next/link"
import { useRouter } from "next/navigation"

interface PostCardProps {
  id?: string
  user?: {
    name: string
    username: string
    avatar?: string
    verified?: boolean
  }
  content: string
  timestamp: string
  likes?: number
  replies?: number
  reposts?: number
  image?: string
  isLiked?: boolean
  isReposted?: boolean
}

export function PostCard({
  id,
  user = { name: 'Anonymous', username: 'anonymous' }, // Add default values for user
  content,
  timestamp,
  likes = 0,
  replies = 0,
  reposts = 0,
  image,
  isLiked = false,
  isReposted = false,
}: PostCardProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [liked, setLiked] = useState(isLiked)
  const [reposted, setReposted] = useState(isReposted)
  const [likesCount, setLikesCount] = useState(likes)
  const [repostsCount, setRepostsCount] = useState(reposts)
  // Ensure username is properly formatted and prioritize proper username over email
  const displayUsername = user?.username || 'anonymous'

  const requireAuth = (action: () => void) => {
    if (!session) {
      // Store current URL for redirect after login
      localStorage.setItem('redirectAfterLogin', window.location.pathname)
      // Redirect to sign-in page
      router.push('/auth/signin')
      return
    }
    action()
  }

  const handleLike = async () => {
    requireAuth(async () => {
      try {
        setLiked(!liked)
        setLikesCount(liked ? likesCount - 1 : likesCount + 1)
        
        // Call API to update like status
        await fetch('/api/posts/like', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ postId: id, liked: !liked }),
        })
      } catch (error) {
        console.error('Error updating like status:', error)
        // Revert UI state if API call fails
        setLiked(liked)
        setLikesCount(likesCount)
      }
    })
  }

  const handleRepost = async () => {
    requireAuth(async () => {
      try {
        console.log(`Toggling repost for post ${id}, current state:`, reposted);
        const newRepostedState = !reposted;
        setReposted(newRepostedState)
        setRepostsCount(reposted ? repostsCount - 1 : repostsCount + 1)
        
        // Call API to update repost status
        console.log(`Sending repost request to API, postId: ${id}, reposted: ${newRepostedState}`);
        const response = await fetch('/api/posts/repost', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ postId: id, reposted: newRepostedState }),
        })
        
        const data = await response.json();
        console.log('Repost API response:', data);
      } catch (error) {
        console.error('Error updating repost status:', error)
        // Revert UI state if API call fails
        setReposted(reposted)
        setRepostsCount(repostsCount)
      }
    })
  }

  const handleReply = () => {
    requireAuth(() => {
      // TODO: Open reply modal or navigate to reply page
      console.log('Reply functionality to be implemented')
    })
  }
  
  const handleUserClick = () => {
    if (!displayUsername) return;
    
    // Check if this is the current user's post
    if (session?.user?.email === user?.email || session?.user?.username === user?.username) {
      // If it's the current user's own post, redirect to their profile page
      router.push(`/profile`);
    } else {
      // Otherwise navigate to the specified user's profile
      router.push(`/profile/${displayUsername}`);
    }
  }

  return (
    <div className="border-b border-border p-4 hover:bg-accent/30 transition-colors">
      <div className="flex space-x-3">
        <div onClick={handleUserClick} className="cursor-pointer">
          <Avatar className="w-10 h-10 ring-1 ring-border hover:ring-primary transition-all">
            <AvatarImage src={user?.avatar || ''} alt={user?.name || 'User'} />
            <AvatarFallback className="bg-muted text-foreground">
              {user?.name ? user.name.charAt(0).toUpperCase() : '?'}
            </AvatarFallback>
          </Avatar>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <span 
              onClick={handleUserClick}
              className="font-semibold text-foreground hover:underline cursor-pointer"
            >
              {user?.name || 'Anonymous'}
            </span>
            {user?.verified && (
              <div className="w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                <span className="text-primary-foreground text-xs">✓</span>
              </div>
            )}
            <span 
              onClick={handleUserClick}
              className="text-muted-foreground hover:underline cursor-pointer"
            >
              @{displayUsername}
            </span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">{timestamp}</span>
          </div>
          
          <div className="mt-1">
            <p className="text-foreground whitespace-pre-wrap leading-relaxed">{content}</p>
            
            {image && (
              <div className="mt-3 rounded-xl overflow-hidden border border-border">
                <img
                  src={image}
                  alt="Post content"
                  className="w-full max-h-96 object-cover"
                />
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center space-x-8">
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center space-x-2 text-muted-foreground hover:text-red-500 p-0 h-auto transition-colors"
                onClick={handleLike}
              >
                <Heart className={`w-5 h-5 ${liked ? 'fill-red-500 text-red-500' : ''}`} />
                {likesCount > 0 && <span className="text-sm">{likesCount}</span>}
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center space-x-2 text-muted-foreground hover:text-primary p-0 h-auto transition-colors"
                onClick={handleReply}
              >
                <MessageCircle className="w-5 h-5" />
                {replies > 0 && <span className="text-sm">{replies}</span>}
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center space-x-2 text-muted-foreground hover:text-green-500 p-0 h-auto transition-colors"
                onClick={handleRepost}
              >
                <Repeat2 className={`w-5 h-5 ${reposted ? 'text-green-500' : ''}`} />
                {repostsCount > 0 && <span className="text-sm">{repostsCount}</span>}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}