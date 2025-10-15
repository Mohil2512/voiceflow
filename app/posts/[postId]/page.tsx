"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Layout } from "@/components/layout/Layout"
import { PostCard } from "@/components/post/PostCard"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Loader2 } from "lucide-react"

interface ThreadPost {
  id: string
  user: {
    name: string
    username: string
    avatar?: string
    image?: string
    verified?: boolean
    email?: string
  }
  content: string
  timestamp: string
  likes: number
  replies: number
  reposts: number
  images?: string[]
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
}

export default function PostThreadPage() {
  const params = useParams<{ postId: string | string[] }>()
  const router = useRouter()
  const postIdParam = params?.postId
  const postId = Array.isArray(postIdParam) ? postIdParam[0] : postIdParam
  const [post, setPost] = useState<ThreadPost | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPost = useCallback(async () => {
    if (!postId) return

    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/posts/${postId}`)
      if (!response.ok) {
        if (response.status === 404) {
          setError("Post not found")
          setPost(null)
          return
        }
        throw new Error("Failed to load post")
      }

      const data = await response.json()
      setPost({
        id: data.id,
        user: data.user,
        content: data.content,
        timestamp: data.timestamp,
        likes: data.likes ?? 0,
        replies: data.replies ?? 0,
        reposts: data.reposts ?? 0,
        images: data.images ?? [],
        isLiked: data.isLiked ?? false,
        isReposted: data.isReposted ?? false,
        canEdit: data.canEdit ?? false,
        repostContext: data.repostContext,
        originalPostId: data.originalPostId,
        isRepostEntry: data.isRepostEntry,
      })
    } catch (postError) {
      console.error("Failed to fetch post:", postError)
      setError(postError instanceof Error ? postError.message : "Failed to fetch post")
      setPost(null)
    } finally {
      setLoading(false)
    }
  }, [postId])

  useEffect(() => {
    fetchPost()
  }, [fetchPost])

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back()
    } else {
      router.push("/")
    }
  }

  return (
    <Layout>
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6 md:px-0 md:py-10">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="flex items-center gap-2 px-0 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to feed
          </Button>
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-border py-20 text-center text-muted-foreground">
            {error}
          </div>
        ) : post ? (
          <PostCard
            id={post.id}
            user={post.user}
            content={post.content}
            timestamp={post.timestamp}
            likes={post.likes}
            replies={post.replies}
            reposts={post.reposts}
            images={post.images}
            isLiked={post.isLiked}
            isReposted={post.isReposted}
            canEdit={post.canEdit}
            repostContext={post.repostContext}
            originalPostId={post.originalPostId}
            isRepostEntry={post.isRepostEntry}
            onPostUpdate={fetchPost}
            forceThreadView
          />
        ) : (
          <div className="rounded-3xl border border-border py-20 text-center text-muted-foreground">
            Something went wrong loading this post.
          </div>
        )}
      </div>
    </Layout>
  )
}
