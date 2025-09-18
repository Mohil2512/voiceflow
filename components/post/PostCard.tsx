"use client"

import { useState } from "react"
import { Heart, MessageCircle, Repeat2, Send, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card } from "@/components/ui/card"

interface PostCardProps {
  id: string
  user: {
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
  user,
  content,
  timestamp,
  likes = 0,
  replies = 0,
  reposts = 0,
  image,
  isLiked = false,
  isReposted = false,
}: PostCardProps) {
  const [liked, setLiked] = useState(isLiked)
  const [reposted, setReposted] = useState(isReposted)
  const [likesCount, setLikesCount] = useState(likes)
  const [repostsCount, setRepostsCount] = useState(reposts)

  const handleLike = () => {
    setLiked(!liked)
    setLikesCount(liked ? likesCount - 1 : likesCount + 1)
  }

  const handleRepost = () => {
    setReposted(!reposted)
    setRepostsCount(reposted ? repostsCount - 1 : repostsCount + 1)
  }

  return (
    <Card className="border-0 border-b border-border bg-transparent rounded-none p-4 hover:bg-accent/50 transition-colors">
      <div className="flex space-x-3">
        <Avatar className="w-10 h-10">
          <AvatarImage src={user.avatar} alt={user.name} />
          <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-foreground">{user.name}</span>
            {user.verified && (
              <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">✓</span>
              </div>
            )}
            <span className="text-muted-foreground">@{user.username}</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">{timestamp}</span>
            <Button variant="ghost" size="icon" className="ml-auto w-8 h-8">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="mt-1">
            <p className="text-foreground whitespace-pre-wrap">{content}</p>
            
            {image && (
              <div className="mt-3 rounded-xl overflow-hidden">
                <img
                  src={image}
                  alt="Post content"
                  className="w-full max-h-96 object-cover"
                />
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-6 mt-3">
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center space-x-2 text-muted-foreground hover:text-foreground p-0 h-auto"
              onClick={handleLike}
            >
              <Heart className={`w-5 h-5 ${liked ? 'fill-red-500 text-red-500' : ''}`} />
              {likesCount > 0 && <span className="text-sm">{likesCount}</span>}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center space-x-2 text-muted-foreground hover:text-foreground p-0 h-auto"
            >
              <MessageCircle className="w-5 h-5" />
              {replies > 0 && <span className="text-sm">{replies}</span>}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center space-x-2 text-muted-foreground hover:text-foreground p-0 h-auto"
              onClick={handleRepost}
            >
              <Repeat2 className={`w-5 h-5 ${reposted ? 'text-green-500' : ''}`} />
              {repostsCount > 0 && <span className="text-sm">{repostsCount}</span>}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center space-x-2 text-muted-foreground hover:text-foreground p-0 h-auto"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}