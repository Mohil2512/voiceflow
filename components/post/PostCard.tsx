"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Heart, MessageCircle, Repeat2, MoreHorizontal, Edit, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { EditPostModal } from "./EditPostModal"
import { ImageModal } from "@/components/ui/image-modal"
import { CommentSection } from "./CommentSection"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import Image from "next/image"

interface CommentWithReplies {
  _id: string
  content: string
  replies?: CommentWithReplies[]
  [key: string]: unknown
}

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
  canEdit?: boolean
  repostContext?: {
    name?: string
    username?: string
    avatar?: string
    email?: string
  }
  originalPostId?: string | null
  isRepostEntry?: boolean
  onPostUpdate?: () => void  // Callback for when post is updated/deleted
}

export function PostCard({
  id,
  user, // Remove default Anonymous fallback
  content,
  timestamp,
  likes = 0,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  replies: _replies = 0, // Unused - we fetch commentCount dynamically instead
  reposts = 0,
  image,
  images = [],
  isLiked = false,
  isReposted = false,
  canEdit,
  repostContext,
  originalPostId,
  isRepostEntry = false,
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
  const [showComments, setShowComments] = useState(false)
  const [commentCount, setCommentCount] = useState(0)

  useEffect(() => {
    setLiked(isLiked)
  }, [isLiked])

  useEffect(() => {
    setReposted(isReposted)
  }, [isReposted])

  useEffect(() => {
    setLikesCount(likes)
  }, [likes])

  useEffect(() => {
    setRepostsCount(reposts)
  }, [reposts])

  // Fetch comment count when post ID changes
  useEffect(() => {
    const fetchCommentCount = async () => {
      if (!id) return
      try {
        const response = await fetch(`/api/posts/${id}/comments`)
        if (response.ok) {
          const data = await response.json()
          const comments: CommentWithReplies[] = data.comments || []
          // Count all comments including nested replies
          const countAllComments = (commentsList: CommentWithReplies[]): number => {
            return commentsList.reduce((total, comment) => {
              const replyCount = comment.replies ? countAllComments(comment.replies) : 0
              return total + 1 + replyCount
            }, 0)
          }
          setCommentCount(countAllComments(comments))
        }
      } catch (error) {
        console.error('Error fetching comment count:', error)
      }
    }
    fetchCommentCount()
  }, [id, showComments]) // Refetch when comments are closed to update count
  
  // Ensure we have valid user data
  if (!user) {
    return null // Don't render posts without valid user data
  }
  
  // Check if current user owns this post
  const isOwner = typeof canEdit === 'boolean'
    ? canEdit
    : session?.user?.email === user.email
  
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
      if (!id) {
        toast({
          title: 'Action unavailable',
          description: 'Unable to find this post. Please refresh and try again.',
          variant: 'destructive'
        })
        return
      }

      const previousLiked = liked
      const previousCount = likesCount
      const nextLiked = !liked

      setLiked(nextLiked)
      setLikesCount(nextLiked ? likesCount + 1 : Math.max(likesCount - 1, 0))

      try {
        const response = await fetch('/api/posts/like', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ postId: id, liked: nextLiked }),
        })

        const data = await response.json().catch(() => ({}))

        if (!response.ok) {
          throw new Error(data.error || 'Failed to update like status')
        }

        if (typeof data.liked === 'boolean') {
          setLiked(data.liked)
        }

        if (typeof data.likes === 'number') {
          setLikesCount(data.likes)
        }
      } catch (error) {
        console.error('Error updating like status:', error)
        setLiked(previousLiked)
        setLikesCount(previousCount)
        toast({
          title: 'Like failed',
          description: error instanceof Error ? error.message : 'Please try again.',
          variant: 'destructive'
        })
      }
    })
  }

  const handleRepost = async () => {
    requireAuth(async () => {
      const targetPostId = originalPostId || id
      if (!targetPostId) {
        toast({
          title: 'Repost unavailable',
          description: 'Unable to locate the original post for this repost action.',
          variant: 'destructive'
        })
        return
      }

      const previousReposted = reposted
      const previousCount = repostsCount
      const nextReposted = !reposted

      setReposted(nextReposted)
      setRepostsCount(nextReposted ? repostsCount + 1 : Math.max(repostsCount - 1, 0))

      try {
        const payload: Record<string, unknown> = {
          postId: targetPostId,
          reposted: nextReposted
        }

        if (isRepostEntry && id) {
          payload.repostId = id
        }

        const response = await fetch('/api/posts/repost', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        })
        
        const data = await response.json().catch(() => ({}))

        if (!response.ok) {
          throw new Error(data.error || 'Failed to update repost status')
        }

        if (typeof data.reposted === 'boolean') {
          setReposted(data.reposted)
        }

        if (typeof data.reposts === 'number') {
          setRepostsCount(data.reposts)
        }
      } catch (error) {
        console.error('Error updating repost status:', error)
        setReposted(previousReposted)
        setRepostsCount(previousCount)
        toast({
          title: 'Repost failed',
          description: error instanceof Error ? error.message : 'Please try again.',
          variant: 'destructive'
        })
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
      setShowComments(!showComments)
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

  const reposterLabel = repostContext?.username
    ? `@${repostContext.username}`
    : repostContext?.name || null

  return (
    <div className="border-b border-border p-3 md:p-4 hover:bg-accent/30 transition-colors">
      {repostContext && (
        <div className="flex items-center text-xs text-muted-foreground mb-2 ml-12">
          <Repeat2 className="w-3 h-3 mr-2" />
          <span>{reposterLabel ? `${reposterLabel} reposted` : 'Reposted'}</span>
        </div>
      )}
      <div className="flex space-x-3">
        <div onClick={handleUserClick} className="cursor-pointer flex-shrink-0">
          <Avatar className="w-10 h-10 ring-1 ring-border hover:ring-primary transition-all">
            <AvatarImage src={user?.avatar || user?.image || ''} alt={displayName} />
            <AvatarFallback className="bg-muted text-foreground">
              {displayName ? displayName.charAt(0).toUpperCase() : '?'}
            </AvatarFallback>
          </Avatar>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 min-w-0 flex-1">
              <span 
                onClick={handleUserClick}
                className="font-semibold text-foreground hover:underline cursor-pointer truncate"
              >
                @{displayUsername}
              </span>
              {user?.verified && (
                <div className="w-4 h-4 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-primary-foreground text-xs">✓</span>
                </div>
              )}
              <span className="text-muted-foreground text-sm flex-shrink-0">
                {(() => {
                  try {
                    const date = new Date(timestamp)
                    if (isNaN(date.getTime())) {
                      return 'Just now'
                    }
                    return date.toLocaleDateString()
                  } catch {
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
                    <Image
                      src={imageUrl}
                      alt={`Post image ${index + 1}`}
                      width={800}
                      height={600}
                      unoptimized
                      className="w-full max-h-80 object-cover"
                      onError={(event) => {
                        console.error('❌ Image failed to load:', imageUrl)
                        event.currentTarget.style.display = 'none'
                      }}
                      onLoadingComplete={(img) => {
                        console.log('✅ Image loaded successfully:', imageUrl)
                        img.style.display = 'block'
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center space-x-4 md:space-x-8">
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center space-x-1 md:space-x-2 text-muted-foreground hover:text-red-500 p-0 h-auto transition-colors"
                onClick={handleLike}
              >
                <Heart className={`w-4 h-4 md:w-5 md:h-5 ${liked ? 'fill-red-500 text-red-500' : ''}`} />
                {likesCount > 0 && <span className="text-xs md:text-sm">{likesCount}</span>}
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                className={`flex items-center space-x-1 md:space-x-2 p-0 h-auto transition-colors ${
                  showComments ? 'text-primary' : 'text-muted-foreground hover:text-primary'
                }`}
                onClick={handleReply}
              >
                <MessageCircle className={`w-4 h-4 md:w-5 md:h-5 ${showComments ? 'fill-primary' : ''}`} />
                {commentCount > 0 && <span className="text-xs md:text-sm">{commentCount}</span>}
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center space-x-1 md:space-x-2 text-muted-foreground hover:text-green-500 p-0 h-auto transition-colors"
                onClick={handleRepost}
              >
                <Repeat2 className={`w-4 h-4 md:w-5 md:h-5 ${reposted ? 'text-green-500' : ''}`} />
                {repostsCount > 0 && <span className="text-xs md:text-sm">{repostsCount}</span>}
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

      {/* Comment Section */}
      {id && (
        <CommentSection
          postId={id}
          isOpen={showComments}
          onClose={() => setShowComments(false)}
          onCommentAdded={() => {
            // Refetch comment count when a new comment is added
            if (!id) return
            fetch(`/api/posts/${id}/comments`)
              .then(res => res.json())
              .then(data => {
                const comments: CommentWithReplies[] = data.comments || []
                const countAllComments = (commentsList: CommentWithReplies[]): number => {
                  return commentsList.reduce((total, comment) => {
                    const replyCount = comment.replies ? countAllComments(comment.replies) : 0
                    return total + 1 + replyCount
                  }, 0)
                }
                setCommentCount(countAllComments(comments))
              })
              .catch(err => console.error('Error updating comment count:', err))
          }}
        />
      )}
    </div>
  )
}