"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

interface User {
  id: string
  name: string
  username: string
  avatar?: string
  bio?: string
}

interface FollowModalProps {
  isOpen: boolean
  onClose: () => void
  username: string
  initialTab?: "followers" | "following"
}

export function FollowModal({ isOpen, onClose, username, initialTab = "followers" }: FollowModalProps) {
  const router = useRouter()
  const [followers, setFollowers] = useState<User[]>([])
  const [following, setFollowing] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState(initialTab)

  useEffect(() => {
    if (isOpen && username) {
      fetchFollowData()
    }
  }, [isOpen, username])

  const fetchFollowData = async () => {
    setIsLoading(true)
    try {
      // Fetch followers
      const followersRes = await fetch(`/api/users/${encodeURIComponent(username)}/followers`)
      if (followersRes.ok) {
        const data = await followersRes.json()
        setFollowers(data.followers || [])
      }

      // Fetch following
      const followingRes = await fetch(`/api/users/${encodeURIComponent(username)}/following`)
      if (followingRes.ok) {
        const data = await followingRes.json()
        setFollowing(data.following || [])
      }
    } catch (error) {
      console.error("Error fetching follow data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUserClick = (clickedUsername: string) => {
    onClose()
    router.push(`/profile/${clickedUsername}`)
  }

  const UserList = ({ users }: { users: User[] }) => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )
    }

    if (users.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">No users to display</p>
        </div>
      )
    }

    return (
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {users.map((user) => (
          <div
            key={user.id}
            className="flex items-center justify-between p-3 hover:bg-accent rounded-lg transition-colors cursor-pointer"
            onClick={() => handleUserClick(user.username)}
          >
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <Avatar className="w-10 h-10 flex-shrink-0">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="bg-muted text-foreground">
                  {user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{user.name}</p>
                <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
                {user.bio && (
                  <p className="text-xs text-muted-foreground truncate mt-1">{user.bio}</p>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={(e) => {
                e.stopPropagation()
                handleUserClick(user.username)
              }}
            >
              View Profile
            </Button>
          </div>
        ))}
      </div>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>@{username}</DialogTitle>
        </DialogHeader>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "followers" | "following")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="followers">
              Followers ({followers.length})
            </TabsTrigger>
            <TabsTrigger value="following">
              Following ({following.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="followers" className="mt-4">
            <UserList users={followers} />
          </TabsContent>
          <TabsContent value="following" className="mt-4">
            <UserList users={following} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
