"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { Heart, MessageCircle, Repeat2, Send, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

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
  const [liked, setLiked] = useState(isLiked)
  const [reposted, setReposted] = useState(isReposted)
  const [likesCount, setLikesCount] = useState(likes)
  const [repostsCount, setRepostsCount] = useState(reposts)

  const requireAuth = (action: () => void) => {
    if (!session) {
      // Store current URL for redirect after login
      localStorage.setItem('redirectAfterLogin', window.location.pathname)
      window.location.href = '/auth/signin'
      return
    }
    action()
  }

  const handleLike = () => {
    requireAuth(() => {
      setLiked(!liked)
      setLikesCount(liked ? likesCount - 1 : likesCount + 1)
    })
  }

  const handleRepost = () => {
    requireAuth(() => {
      setReposted(!reposted)
      setRepostsCount(reposted ? repostsCount - 1 : repostsCount + 1)
    })
  }

  const handleReply = () => {
    requireAuth(() => {
      // TODO: Open reply modal or navigate to reply page
      console.log('Reply functionality to be implemented')
    })
  }

  const handleShare = () => {
    requireAuth(() => {
      // TODO: Open share modal
      console.log('Share functionality to be implemented')
    })
  }

  return (
    <div className="border-b border-border p-4 hover:bg-accent/30 transition-colors">
      <div className="flex space-x-3">
        <Avatar className="w-10 h-10 ring-1 ring-border">
          <AvatarImage src={user?.avatar || ''} alt={user?.name || 'User'} />
          <AvatarFallback className="bg-muted text-foreground">
            {user?.name ? user.name.charAt(0).toUpperCase() : '?'}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-foreground">{user?.name || 'Anonymous'}</span>
            {user?.verified && (
              <div className="w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                <span className="text-primary-foreground text-xs">✓</span>
              </div>
            )}
            <span className="text-muted-foreground">@{user?.username || 'anonymous'}</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">{timestamp}</span>
            <Button variant="ghost" size="icon" className="ml-auto w-8 h-8 text-muted-foreground hover:text-foreground hover:bg-accent">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
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
          
          <div className="flex items-center space-x-8 mt-4">
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
            
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center space-x-2 text-muted-foreground hover:text-primary p-0 h-auto transition-colors"
              onClick={handleShare}
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}