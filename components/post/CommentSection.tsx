"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useSession } from "next-auth/react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { MessageCircle, Send, Loader2 } from "lucide-react"

interface Comment {
  _id: string
  content: string
  author: {
    name: string
    username: string
    avatar?: string
    email: string
  }
  createdAt: string
  replies?: Comment[]
}

interface CommentSectionProps {
  postId: string
  isOpen: boolean
  onClose: () => void
  onCommentAdded?: () => void
}

export function CommentSection({ postId, isOpen, onClose, onCommentAdded }: CommentSectionProps) {
  const { data: session } = useSession()
  const { toast } = useToast()
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState<Record<string, string>>({})

  const fetchComments = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/posts/${postId}/comments`)
      if (response.ok) {
        const data = await response.json()
        setComments(data.comments || [])
      }
    } catch (error) {
      console.error("Error fetching comments:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchComments()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, postId])

  const handleSubmitComment = async () => {
    if (!session) {
      toast({
        title: "Authentication required",
        description: "Please sign in to comment",
        variant: "destructive",
      })
      return
    }

    if (!newComment.trim()) {
      toast({
        title: "Empty comment",
        description: "Please write something before posting",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: newComment.trim(),
        }),
      })

      if (response.ok) {
        setNewComment("")
        await fetchComments()
        onCommentAdded?.() // Notify parent to update comment count
        toast({
          title: "Success",
          description: "Comment posted successfully",
        })
      } else {
        const error = await response.json()
        throw new Error(error.error || "Failed to post comment")
      }
    } catch (error) {
      console.error("Error posting comment:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to post comment",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmitReply = async (parentCommentId: string) => {
    if (!session) {
      toast({
        title: "Authentication required",
        description: "Please sign in to reply",
        variant: "destructive",
      })
      return
    }

    const content = replyContent[parentCommentId] || ""
    if (!content.trim()) {
      toast({
        title: "Empty reply",
        description: "Please write something before posting",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: content.trim(),
          parentId: parentCommentId,
        }),
      })

      if (response.ok) {
        setReplyContent(prev => ({ ...prev, [parentCommentId]: "" }))
        setReplyingTo(null)
        await fetchComments()
        onCommentAdded?.() // Notify parent to update comment count
        toast({
          title: "Success",
          description: "Reply posted successfully",
        })
      } else {
        const error = await response.json()
        throw new Error(error.error || "Failed to post reply")
      }
    } catch (error) {
      console.error("Error posting reply:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to post reply",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const CommentItem = ({ comment, depth = 0 }: { comment: Comment; depth?: number }) => {
    const [showReplies, setShowReplies] = useState(true)
    const isReplying = replyingTo === comment._id
    const hasReplies = comment.replies && comment.replies.length > 0

    return (
      <div className={`${depth > 0 ? 'ml-8 border-l-2 border-border pl-4' : ''} py-3`}>
        <div className="flex space-x-3">
          <Avatar className="w-8 h-8 flex-shrink-0">
            <AvatarImage src={comment.author.avatar || ''} alt={comment.author.name} />
            <AvatarFallback className="bg-muted text-foreground">
              {comment.author.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-sm">@{comment.author.username}</span>
              <span className="text-xs text-muted-foreground">
                {new Date(comment.createdAt).toLocaleDateString()}
              </span>
            </div>
            
            <p className="text-sm mt-1 text-foreground whitespace-pre-wrap">
              {comment.content}
            </p>
            
            <div className="flex items-center space-x-4 mt-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 text-xs text-muted-foreground hover:text-primary"
                onClick={() => {
                  if (isReplying) {
                    setReplyingTo(null)
                    setReplyContent(prev => ({ ...prev, [comment._id]: "" }))
                  } else {
                    setReplyingTo(comment._id)
                  }
                }}
              >
                <MessageCircle className="w-3 h-3 mr-1" />
                Reply
              </Button>
              
              {hasReplies && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 text-xs text-muted-foreground hover:text-primary"
                  onClick={() => setShowReplies(!showReplies)}
                >
                  {showReplies ? 'Hide' : 'Show'} {comment.replies!.length} {comment.replies!.length === 1 ? 'reply' : 'replies'}
                </Button>
              )}
            </div>
            
            {/* Reply input */}
            {isReplying && (
              <div className="mt-3 space-y-2">
                <Textarea
                  value={replyContent[comment._id] || ""}
                  onChange={(e) => setReplyContent(prev => ({ ...prev, [comment._id]: e.target.value }))}
                  placeholder="Write your reply..."
                  className="min-h-[80px] resize-none"
                  disabled={isSubmitting}
                  autoFocus
                />
                <div className="flex justify-end space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setReplyingTo(null)
                      setReplyContent(prev => ({ ...prev, [comment._id]: "" }))
                    }}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleSubmitReply(comment._id)}
                    disabled={isSubmitting || !(replyContent[comment._id] || "").trim()}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Posting...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Reply
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
            
            {/* Nested replies */}
            {hasReplies && showReplies && (
              <div className="mt-2">
                {comment.replies!.map((reply) => (
                  <CommentItem key={reply._id} comment={reply} depth={depth + 1} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (!isOpen) return null

  return (
    <div className="border-t border-border bg-muted/30">
      <div className="p-4 max-h-[600px] overflow-y-auto">
        {/* New Comment Input */}
        {session && (
          <div className="mb-6">
            <div className="flex space-x-3">
              <Avatar className="w-8 h-8 flex-shrink-0">
                <AvatarImage src={session.user?.image || ''} alt={session.user?.name || ''} />
                <AvatarFallback className="bg-muted text-foreground">
                  {session.user?.name?.charAt(0).toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 space-y-2">
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Write a comment..."
                  className="min-h-[80px] resize-none"
                  disabled={isSubmitting}
                />
                <div className="flex justify-end">
                  <Button
                    onClick={handleSubmitComment}
                    disabled={isSubmitting || !newComment.trim()}
                    size="sm"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Posting...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Comment
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Comments List */}
        <div className="space-y-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No comments yet. Be the first to comment!</p>
            </div>
          ) : (
            comments.map((comment) => (
              <CommentItem key={comment._id} comment={comment} />
            ))
          )}
        </div>
      </div>
      
      <div className="border-t border-border p-3 bg-background">
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="w-full"
        >
          Close Comments
        </Button>
      </div>
    </div>
  )
}
