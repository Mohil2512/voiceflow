"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import Image from "next/image"
import { useSession } from "next-auth/react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { MessageCircle, Send, Loader2, Heart, ArrowRight, Pencil, Trash2, Check } from "lucide-react"
import { cn } from "@/lib/utils"

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
  likes?: string[]
  likesCount?: number
  isLiked?: boolean
  editedAt?: string
}

const collectCommentIds = (comment: Comment): string[] => {
  const ids = [comment._id]
  if (comment.replies && comment.replies.length > 0) {
    for (const reply of comment.replies) {
      ids.push(...collectCommentIds(reply))
    }
  }
  return ids
}

interface PostSummary {
  authorName: string
  authorUsername: string
  authorAvatar?: string
  timestamp: string
  content: string
  images?: string[]
  metrics?: {
    likes: number
    comments: number
    reposts: number
  }
}

type CommentMode = "dialog" | "page"

interface CommentSectionProps {
  postId: string
  postSummary: PostSummary
  mode: CommentMode
  isOpen?: boolean
  onClose?: () => void
  onCommentAdded?: () => void
  onRequestThreadView?: () => void
}

const deriveCommentState = (comments: Comment[], userEmail?: string | null): Comment[] => {
  return comments.map((comment) => {
    const likesArray = Array.isArray(comment.likes) ? comment.likes : []
    return {
      ...comment,
      likes: likesArray,
      likesCount: likesArray.length,
      isLiked: userEmail ? likesArray.includes(userEmail) : false,
      replies: comment.replies ? deriveCommentState(comment.replies, userEmail) : [],
    }
  })
}

const toggleLikeState = (comments: Comment[], targetId: string, userEmail: string): { comments: Comment[]; updated: boolean } => {
  let updated = false

  const mapped = comments.map((comment) => {
    if (updated) {
      return comment
    }

    if (comment._id === targetId) {
      const likesArray = Array.isArray(comment.likes) ? [...comment.likes] : []
      const alreadyLiked = likesArray.includes(userEmail)
      const nextLikes = alreadyLiked
        ? likesArray.filter((like) => like !== userEmail)
        : [...likesArray, userEmail]

      updated = true
      return {
        ...comment,
        likes: nextLikes,
        likesCount: nextLikes.length,
        isLiked: !alreadyLiked,
      }
    }

    if (comment.replies && comment.replies.length > 0) {
      const { comments: nextReplies, updated: childUpdated } = toggleLikeState(comment.replies, targetId, userEmail)
      if (childUpdated) {
        updated = true
        return {
          ...comment,
          replies: nextReplies,
        }
      }
    }

    return comment
  })

  return { comments: mapped, updated }
}

const formatTimestamp = (value: string) => {
  try {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ""

    const now = Date.now()
    const diff = now - date.getTime()
    const minute = 60 * 1000
    const hour = 60 * minute
    const day = 24 * hour

    if (diff < hour) {
      const mins = Math.max(1, Math.round(diff / minute))
      return `${mins}m`
    }
    if (diff < day) {
      const hours = Math.round(diff / hour)
      return `${hours}h`
    }
    return date.toLocaleDateString()
  } catch (error) {
    console.error("Failed to format comment timestamp", error)
    return ""
  }
}

interface ComposerProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => Promise<void> | void
  disabled: boolean
  posting: boolean
  placeholder: string
}

const CommentComposer = ({ value, onChange, onSubmit, disabled, posting, placeholder }: ComposerProps) => {
  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      onSubmit()
    }
  }

  return (
    <div className="flex space-x-3">
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="flex-1 min-h-[64px] max-h-40 resize-none rounded-2xl border border-border bg-background px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        disabled={disabled}
      />
      <Button
        onClick={onSubmit}
        disabled={disabled || !value.trim()}
        size="icon"
        className="h-10 w-10 rounded-full"
      >
        {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
      </Button>
    </div>
  )
}

export function CommentSection({
  postId,
  postSummary,
  mode,
  isOpen = false,
  onClose,
  onCommentAdded,
  onRequestThreadView,
}: CommentSectionProps) {
  const { data: session } = useSession()
  const { toast } = useToast()
  const [comments, setComments] = useState<Comment[]>([])
  const [mainComment, setMainComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null)
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({})
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editTexts, setEditTexts] = useState<Record<string, string>>({})
  const [savingEditId, setSavingEditId] = useState<string | null>(null)
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null)
  const replyTextareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({})
  const editTextareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({})

  const isDialog = mode === "dialog"
  const userEmail = session?.user?.email ?? null

  const fetchComments = useCallback(async () => {
    if (!postId) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/posts/${postId}/comments`)
      if (response.ok) {
        const data = await response.json()
        const enhanced = deriveCommentState(data.comments || [], userEmail)
        setComments(enhanced)
      }
    } catch (error) {
      console.error("Error fetching comments:", error)
    } finally {
      setIsLoading(false)
    }
  }, [postId, userEmail])

  useEffect(() => {
    if (mode === "page") {
      fetchComments()
      return
    }

    if (isOpen) {
      fetchComments()
      setMainComment("")
      setReplyTexts({})
      setActiveReplyId(null)
      setEditingCommentId(null)
      setEditTexts({})
      setSavingEditId(null)
      setDeletingCommentId(null)
    }
  }, [mode, isOpen, fetchComments])

  const ensureAuthenticated = (action: () => void | Promise<void>) => {
    if (!session) {
      toast({
        title: "Authentication required",
        description: "Please sign in to participate in the conversation",
        variant: "destructive",
      })
      return
    }
    return action()
  }

  const handleMainCommentSubmit = async () => {
    ensureAuthenticated(async () => {
      if (!mainComment.trim()) {
        toast({
          title: "Empty reply",
          description: "Share your thoughts before posting",
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
          body: JSON.stringify({ content: mainComment.trim() }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || "Failed to publish comment")
        }

        setMainComment("")
        await fetchComments()
        onCommentAdded?.()
        toast({
          title: "Comment posted",
          description: "Your reply is now live",
        })
      } catch (error) {
        console.error("Error posting comment:", error)
        toast({
          title: "Something went wrong",
          description: error instanceof Error ? error.message : "Unable to post comment",
          variant: "destructive",
        })
      } finally {
        setIsSubmitting(false)
      }
    })
  }

  const handleReplySubmit = async (commentId: string) => {
    ensureAuthenticated(async () => {
      const replyText = replyTexts[commentId] || ""
      if (!replyText.trim()) {
        toast({
          title: "Empty reply",
          description: "Add a message before replying",
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
            content: replyText.trim(),
            parentId: commentId,
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || "Failed to publish reply")
        }

        setReplyTexts((previous) => {
          const updated = { ...previous }
          delete updated[commentId]
          return updated
        })
        setActiveReplyId(null)
        await fetchComments()
        onCommentAdded?.()
        toast({
          title: "Reply posted",
          description: "Your reply has been added to the thread",
        })
      } catch (error) {
        console.error("Error posting reply:", error)
        toast({
          title: "Something went wrong",
          description: error instanceof Error ? error.message : "Unable to post reply",
          variant: "destructive",
        })
      } finally {
        setIsSubmitting(false)
      }
    })
  }

  const handleLikeComment = async (commentId: string) => {
    ensureAuthenticated(async () => {
      if (!userEmail) {
        return
      }

      setComments((previous) => {
        const { comments: nextComments } = toggleLikeState(previous, commentId, userEmail)
        return nextComments
      })

      try {
        const response = await fetch(`/api/posts/${postId}/comments/${commentId}/like`, {
          method: "POST",
        })

        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: "Failed to like comment" }))
          throw new Error(error.error || "Failed to like comment")
        }
      } catch (error) {
        console.error("Error liking comment:", error)
        toast({
          title: "Unable to like",
          description: error instanceof Error ? error.message : "Please try again",
          variant: "destructive",
        })
      } finally {
        fetchComments()
      }
    })
  }

  const activeReplyText = activeReplyId ? replyTexts[activeReplyId] : undefined
  const activeEditText = editingCommentId ? editTexts[editingCommentId] : undefined

  useEffect(() => {
    if (!activeReplyId) return

    const activeTextarea = replyTextareaRefs.current[activeReplyId]
    if (!activeTextarea) return

    if (document.activeElement === activeTextarea) {
      return
    }

    const caretPosition = activeTextarea.value.length
    activeTextarea.focus()
    try {
      activeTextarea.setSelectionRange(caretPosition, caretPosition)
    } catch {
      // Ignore selection range errors in unsupported browsers
    }
  }, [activeReplyId, activeReplyText])

  useEffect(() => {
    if (!editingCommentId) return

    const activeTextarea = editTextareaRefs.current[editingCommentId]
    if (!activeTextarea) return

    if (document.activeElement === activeTextarea) {
      return
    }

    const caretPosition = activeTextarea.value.length
    activeTextarea.focus()
    try {
      activeTextarea.setSelectionRange(caretPosition, caretPosition)
    } catch {
      // Ignore selection range errors in unsupported browsers
    }
  }, [editingCommentId, activeEditText])

  const updateReplyText = (commentId: string, value: string) => {
    setReplyTexts((previous) => ({
      ...previous,
      [commentId]: value,
    }))
  }

  const updateEditText = (commentId: string, value: string) => {
    setEditTexts((previous) => ({
      ...previous,
      [commentId]: value,
    }))
  }

  const startEditingComment = (comment: Comment) => {
    ensureAuthenticated(() => {
      setActiveReplyId(null)
      setEditingCommentId(comment._id)
      setEditTexts((previous) => ({
        ...previous,
        [comment._id]: previous[comment._id] ?? comment.content,
      }))
    })
  }

  const cancelEditingComment = (commentId: string) => {
    setEditingCommentId((current) => (current === commentId ? null : current))
    setEditTexts((previous) => {
      const updated = { ...previous }
      delete updated[commentId]
      return updated
    })
  }

  const handleUpdateComment = async (commentId: string) => {
    ensureAuthenticated(async () => {
      const draft = (editTexts[commentId] ?? "").trim()
      if (!draft) {
        toast({
          title: "Empty comment",
          description: "Add some text before saving",
          variant: "destructive",
        })
        return
      }

      setSavingEditId(commentId)
      try {
        const response = await fetch(`/api/posts/${postId}/comments/${commentId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ content: draft }),
        })

        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: "Failed to update comment" }))
          throw new Error(error.error || "Failed to update comment")
        }

        setEditingCommentId(null)
        setEditTexts((previous) => {
          const updated = { ...previous }
          delete updated[commentId]
          return updated
        })

        toast({
          title: "Comment updated",
          description: "Your comment has been edited",
        })

        await fetchComments()
      } catch (error) {
        console.error("Error updating comment:", error)
        toast({
          title: "Something went wrong",
          description: error instanceof Error ? error.message : "Unable to update comment",
          variant: "destructive",
        })
      } finally {
        setSavingEditId(null)
      }
    })
  }

  const handleDeleteComment = async (comment: Comment) => {
    ensureAuthenticated(async () => {
      const confirmed = typeof window !== "undefined" ? window.confirm("Delete this comment?") : true
      if (!confirmed) {
        return
      }

      setDeletingCommentId(comment._id)
      try {
        const response = await fetch(`/api/posts/${postId}/comments/${comment._id}`, {
          method: "DELETE",
        })

        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: "Failed to delete comment" }))
          throw new Error(error.error || "Failed to delete comment")
        }

        const idsToClear = collectCommentIds(comment)

        setReplyTexts((previous) => {
          if (idsToClear.length === 0) return previous
          const updated = { ...previous }
          for (const id of idsToClear) {
            delete updated[id]
          }
          return updated
        })

        setEditTexts((previous) => {
          if (idsToClear.length === 0) return previous
          const updated = { ...previous }
          for (const id of idsToClear) {
            delete updated[id]
          }
          return updated
        })

        if (editingCommentId && idsToClear.includes(editingCommentId)) {
          setEditingCommentId(null)
        }

        if (activeReplyId && idsToClear.includes(activeReplyId)) {
          setActiveReplyId(null)
        }

        toast({
          title: "Comment removed",
          description: "The comment has been deleted",
        })

        await fetchComments()
      } catch (error) {
        console.error("Error deleting comment:", error)
        toast({
          title: "Something went wrong",
          description: error instanceof Error ? error.message : "Unable to delete comment",
          variant: "destructive",
        })
      } finally {
        setDeletingCommentId(null)
      }
    })
  }

  const CommentThreadItem = ({ comment, depth = 0 }: { comment: Comment; depth?: number }) => {
    const isReplyActive = activeReplyId === comment._id
    const hasReplies = comment.replies && comment.replies.length > 0
    const isOwner = session?.user?.email === comment.author.email
    const isEditing = editingCommentId === comment._id
    const editValue = editTexts[comment._id] ?? comment.content
    const isSavingEdit = savingEditId === comment._id
    const isDeleting = deletingCommentId === comment._id

    return (
      <div
        className={cn(
          "py-4",
          depth > 0 && "ml-6 border-l border-border pl-4"
        )}
      >
        <div className="flex space-x-3">
          <Avatar className="h-10 w-10 flex-shrink-0">
            <AvatarImage src={comment.author.avatar || ""} alt={comment.author.name} />
            <AvatarFallback className="bg-muted text-foreground">
              {comment.author.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold truncate">@{comment.author.username}</span>
              <span className="text-xs text-muted-foreground">{formatTimestamp(comment.createdAt)}</span>
              {comment.editedAt && (
                <span className="text-xs text-muted-foreground">· Edited</span>
              )}
            </div>
            {isEditing ? (
              <div className="mt-2 space-y-3">
                <textarea
                  ref={(element) => {
                    if (element) {
                      editTextareaRefs.current[comment._id] = element
                    } else {
                      delete editTextareaRefs.current[comment._id]
                    }
                  }}
                  value={editValue}
                  onChange={(event) => updateEditText(comment._id, event.target.value)}
                  placeholder="Update your comment"
                  className="w-full min-h-[64px] resize-none rounded-2xl border border-border bg-background px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  disabled={isSavingEdit}
                />
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => cancelEditingComment(comment._id)}
                    disabled={isSavingEdit}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleUpdateComment(comment._id)}
                    disabled={isSavingEdit || !editValue.trim()}
                  >
                    {isSavingEdit ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Save
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap break-words">{comment.content}</p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <button
                className={cn(
                  "flex items-center gap-1 transition-colors",
                  comment.isLiked ? "text-red-500" : "hover:text-foreground"
                )}
                onClick={() => handleLikeComment(comment._id)}
              >
                <Heart className={cn("h-4 w-4", comment.isLiked && "fill-current")} />
                <span>{comment.likesCount || 0}</span>
              </button>
              <button
                className={cn(
                  "flex items-center gap-1 hover:text-foreground",
                  isEditing && "opacity-60"
                )}
                onClick={() => {
                  if (isReplyActive) {
                    setActiveReplyId(null)
                    setReplyTexts((previous) => {
                      const updated = { ...previous }
                      delete updated[comment._id]
                      return updated
                    })
                  } else {
                    setEditingCommentId(null)
                    setActiveReplyId(comment._id)
                  }
                }}
                disabled={isEditing || isDeleting}
              >
                <MessageCircle className="h-4 w-4" />
                Reply
              </button>
              {isOwner && !isEditing && (
                <button
                  className={cn(
                    "flex items-center gap-1 hover:text-foreground",
                    isDeleting && "opacity-60 cursor-not-allowed"
                  )}
                  onClick={() => startEditingComment(comment)}
                  disabled={isDeleting}
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </button>
              )}
              {isOwner && (
                <button
                  className={cn(
                    "flex items-center gap-1 transition-colors",
                    "text-destructive hover:text-destructive",
                    isDeleting && "opacity-70"
                  )}
                  onClick={() => handleDeleteComment(comment)}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </>
                  )}
                </button>
              )}
              {hasReplies && (
                <span>{comment.replies!.length} {comment.replies!.length === 1 ? "reply" : "replies"}</span>
              )}
            </div>

            {isReplyActive && (
              <div className="mt-3 space-y-3">
                <textarea
                  ref={(element) => {
                    if (element) {
                      replyTextareaRefs.current[comment._id] = element
                    } else {
                      delete replyTextareaRefs.current[comment._id]
                    }
                  }}
                  value={replyTexts[comment._id] || ""}
                  onChange={(event) => updateReplyText(comment._id, event.target.value)}
                  placeholder="Reply to this comment"
                  className="w-full min-h-[56px] resize-none rounded-2xl border border-border bg-background px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  disabled={isSubmitting}
                />
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setActiveReplyId(null)
                      setReplyTexts((previous) => {
                        const updated = { ...previous }
                        delete updated[comment._id]
                        return updated
                      })
                    }}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleReplySubmit(comment._id)}
                    disabled={isSubmitting || !(replyTexts[comment._id] || "").trim()}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Posting...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Reply
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {hasReplies && (
              <div className="mt-4 space-y-4">
                {comment.replies!.map((reply) => (
                  <CommentThreadItem key={reply._id} comment={reply} depth={depth + 1} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  const visibleComments = useMemo(() => {
    return isDialog ? comments.slice(0, 3) : comments
  }, [comments, isDialog])

  if (isDialog) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) {
          onClose?.()
        }
      }}>
        <DialogContent className="w-full max-w-xl overflow-hidden border-border p-0">
          <DialogHeader className="border-b border-border px-6 py-5">
            <DialogTitle className="text-lg font-semibold">Comments</DialogTitle>
          </DialogHeader>

          <div className="grid gap-6 px-6 py-6">
            <div className="flex items-start gap-3">
              <Avatar className="h-11 w-11 flex-shrink-0">
                <AvatarImage src={postSummary.authorAvatar || ""} alt={postSummary.authorName} />
                <AvatarFallback className="bg-muted text-foreground">
                  {postSummary.authorName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-3">
                <div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-semibold">{postSummary.authorName}</span>
                    <span className="text-muted-foreground">@{postSummary.authorUsername}</span>
                    <span className="text-xs text-muted-foreground">{formatTimestamp(postSummary.timestamp)}</span>
                  </div>
                  <p className="mt-2 text-sm whitespace-pre-wrap break-words">{postSummary.content}</p>
                </div>

                {postSummary.images && postSummary.images.length > 0 && (
                  <div className="flex gap-2">
                    {postSummary.images.slice(0, 2).map((image, index) => (
                      <div key={image} className="relative h-24 w-24 overflow-hidden rounded-xl border border-border">
                        <Image
                          src={image}
                          alt={`Post media ${index + 1}`}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {postSummary.metrics && (
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{postSummary.metrics.comments} comments</span>
                    <span>{postSummary.metrics.likes} likes</span>
                    <span>{postSummary.metrics.reposts} reposts</span>
                  </div>
                )}
              </div>
            </div>

            {session && (
              <CommentComposer
                value={mainComment}
                onChange={setMainComment}
                onSubmit={handleMainCommentSubmit}
                disabled={isSubmitting}
                posting={isSubmitting}
                placeholder="Add a reply"
              />
            )}

            <button
              type="button"
              onClick={() => {
                onRequestThreadView?.()
              }}
              className="flex items-center justify-between rounded-2xl border border-border bg-muted/40 px-4 py-4 text-left transition-colors hover:border-primary/50 hover:bg-muted/60"
            >
              <div>
                <p className="text-sm font-medium">Open full conversation</p>
                <p className="text-xs text-muted-foreground">See every reply in a focused view</p>
              </div>
              <ArrowRight className="h-5 w-5" />
            </button>

            <div className="max-h-64 space-y-4 overflow-y-auto pr-1">
              {isLoading ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : visibleComments.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                  <MessageCircle className="mx-auto mb-3 h-6 w-6" />
                  Be the first to start the conversation
                </div>
              ) : (
                visibleComments.map((comment) => (
                  <div key={comment._id} className="rounded-2xl border border-border p-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarImage src={comment.author.avatar || ""} alt={comment.author.name} />
                        <AvatarFallback className="bg-muted text-foreground text-xs">
                          {comment.author.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">@{comment.author.username}</span>
                          <span className="text-xs text-muted-foreground">{formatTimestamp(comment.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                    <p className="mt-3 text-sm whitespace-pre-wrap break-words">{comment.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <section className="mt-6 space-y-6">
      {session && (
        <div className="rounded-3xl border border-border bg-card/40 p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={session.user?.image || ""} alt={session.user?.name || ""} />
              <AvatarFallback className="bg-muted text-foreground">
                {session.user?.name?.charAt(0).toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
            <CommentComposer
              value={mainComment}
              onChange={setMainComment}
              onSubmit={handleMainCommentSubmit}
              disabled={isSubmitting}
              posting={isSubmitting}
              placeholder={postSummary ? `Reply to @${postSummary.authorUsername}` : "Add a reply"}
            />
          </div>
        </div>
      )}

      <div className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center rounded-3xl border border-border py-12 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : comments.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border py-12 text-center text-muted-foreground">
            <MessageCircle className="mx-auto mb-3 h-6 w-6" />
            No replies yet. Start the conversation!
          </div>
        ) : (
          comments.map((comment) => (
            <CommentThreadItem key={comment._id} comment={comment} />
          ))
        )}
      </div>
    </section>
  )
}
