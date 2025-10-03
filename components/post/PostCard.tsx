"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { Heart, MessageCircle, Repeat2, MoreHorizontal, Edit, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { EditPostModal } from "./EditPostModal"
import { ImageModal } from "@/components/ui/image-modal"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { useRouter } from "next/navigation"

interface PostCardProps {
  id?: string
  user?: {
    name: string
    username: string
    avatar?: string
    image?: string  // Added image field for compatibility
    verified?: boolean
    email?: string
  }
  content: string
  timestamp: string
  likes?: number
  replies?: number
  reposts?: number
  image?: string
  images?: string[]  // Added for multiple images support
  isLiked?: boolean
  isReposted?: boolean
  onPostUpdate?: () => void  // Callback for when post is updated/deleted
}

export function PostCard({
  id,
  user, // Remove default Anonymous fallback
  content,
  timestamp,
  likes = 0,
  replies = 0,
  reposts = 0,
  image,
  images = [],
  isLiked = false,
  isReposted = false,
  onPostUpdate,
}: PostCardProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const [liked, setLiked] = useState(isLiked)
  const [reposted, setReposted] = useState(isReposted)
  const [likesCount, setLikesCount] = useState(likes)
  const [repostsCount, setRepostsCount] = useState(reposts)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showImageModal, setShowImageModal] = useState(false)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  
  // Ensure we have valid user data
  if (!user) {
    return null // Don't render posts without valid user data
  }
  
  // Check if current user owns this post
  const isOwner = session?.user?.email === user.email
  
  // Ensure username is properly formatted and prioritize proper username over email
  const displayUsername = user?.username || 'anonymous'
  const displayName = user?.name || user?.username || 'Anonymous'
  
  // Get display images (support both single image and multiple images)
  const displayImages = images.length > 0 ? images : (image ? [image] : [])

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
        
        if (!response.ok) {
          throw new Error('Failed to update repost status')
        }
      } catch (error) {
        console.error('Error updating repost status:', error)
        // Revert UI state if API call fails
        setReposted(reposted)
        setRepostsCount(repostsCount)
      }
    })
  }

  const handleDelete = async () => {
    if (!id) return
    
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/posts/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Post deleted successfully"
        })
        onPostUpdate?.() // Refresh the posts list
      } else {
        const result = await response.json()
        throw new Error(result.error || 'Failed to delete post')
      }
    } catch (error) {
      console.error('Error deleting post:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete post",
        variant: "destructive"
      })
    } finally {
      setIsDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  const handleReply = () => {
    requireAuth(() => {
      // TODO: Open reply modal or navigate to reply page
      console.log('Reply functionality to be implemented')
    })
  }

  const handleImageClick = (index: number) => {
    setSelectedImageIndex(index)
    setShowImageModal(true)
  }
  
  const handleUserClick = () => {
    if (!displayUsername) return;
    
    // Check if this is the current user's post
    if (session?.user?.email === user?.email || session?.user?.username === user?.username) {
      // If it's the current user's own post, redirect to their profile page
      router.push(`/profile`);
    } else {
      // First make sure username is valid and safely encoded
      const safeUsername = displayUsername.trim().replace(/\s+/g, '_');
      console.log(`Navigating to profile: ${safeUsername}`);
      
      // Otherwise navigate to the specified user's profile
      router.push(`/profile/${encodeURIComponent(safeUsername)}`);
    }
  }

  return (
    <div className="border-b border-border p-4 hover:bg-accent/30 transition-colors">
      <div className="flex space-x-3">
        <div onClick={handleUserClick} className="cursor-pointer">
          <Avatar className="w-10 h-10 ring-1 ring-border hover:ring-primary transition-all">
            <AvatarImage src={user?.avatar || user?.image || ''} alt={displayName} />
            <AvatarFallback className="bg-muted text-foreground">
              {displayName ? displayName.charAt(0).toUpperCase() : '?'}
            </AvatarFallback>
          </Avatar>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span 
                onClick={handleUserClick}
                className="font-semibold text-foreground hover:underline cursor-pointer"
              >
                @{displayUsername}
              </span>
              {user?.verified && (
                <div className="w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-primary-foreground text-xs">✓</span>
                </div>
              )}
              <span className="text-muted-foreground text-sm">
                {(() => {
                  try {
                    const date = new Date(timestamp)
                    if (isNaN(date.getTime())) {
                      return 'Just now'
                    }
                    return date.toLocaleDateString()
                  } catch (error) {
                    return 'Just now'
                  }
                })()}
              </span>
            </div>
            
            {/* Edit/Delete menu for post owner */}
            {isOwner && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setShowEditModal(true)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Post
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Post
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          
          <div className="mt-1">
            <p className="text-foreground whitespace-pre-wrap leading-relaxed">{content}</p>
            
            {/* Display images */}
            {displayImages.length > 0 && (
              <div className="mt-3 space-y-2">
                {displayImages.map((imageUrl, index) => (
                  <div 
                    key={index} 
                    className="rounded-xl overflow-hidden border border-border cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => handleImageClick(index)}
                  >
                    <img
                      src={imageUrl}
                      alt={`Post image ${index + 1}`}
                      className="w-full max-h-80 object-cover"
                      onError={(e) => {
                        console.error('❌ Image failed to load:', imageUrl)
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                      onLoad={(e) => {
                        console.log('✅ Image loaded successfully:', imageUrl)
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'block';
                      }}
                    />
                  </div>
                ))}
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

      {/* Edit Post Modal */}
      {showEditModal && (
        <EditPostModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          post={{
            id: id || '',
            content,
            images: displayImages
          }}
          onSuccess={() => {
            onPostUpdate?.()
            setShowEditModal(false)
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Post</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this post? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Image Modal */}
      <ImageModal
        images={displayImages}
        initialIndex={selectedImageIndex}
        isOpen={showImageModal}
        onClose={() => setShowImageModal(false)}
      />
    </div>
  )
}