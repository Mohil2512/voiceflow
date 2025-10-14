"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ImageIcon, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Image from "next/image"

interface EditPostModalProps {
  isOpen: boolean
  onClose: () => void
  post: {
    id: string
    content: string
    images?: string[]
  }
  onSuccess: () => void
}

export function EditPostModal({ isOpen, onClose, post, onSuccess }: EditPostModalProps) {
  const [content, setContent] = useState(post.content)
  const [existingImages, setExistingImages] = useState<string[]>(post.images || [])
  const [newImages, setNewImages] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const hasText = content.trim().length > 0
  const hasAnyImages = existingImages.length > 0 || newImages.length > 0

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const validFiles = files.filter(file => file.type.startsWith('image/'))
    
    if (validFiles.length > 0) {
      setNewImages(prev => [...prev, ...validFiles])
    }
  }

  const removeExistingImage = (index: number) => {
    setExistingImages(prev => prev.filter((_, i) => i !== index))
  }

  const removeNewImage = (index: number) => {
    setNewImages(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

  const hasContent = content.trim().length > 0
  const hasImages = existingImages.length > 0 || newImages.length > 0

    if (!hasContent && !hasImages) {
      toast({
        title: "Error",
        description: "Add text or at least one image before saving",
        variant: "destructive"
      })
      return
    }

    setIsSubmitting(true)

    try {
    const formData = new FormData()
    formData.append('content', content.trim())
      
      // Add new images to formData
      newImages.forEach(image => {
        formData.append('images', image)
      })

      const response = await fetch(`/api/posts/${post.id}`, {
        method: 'PUT',
        body: formData
      })

      const result = await response.json()

      if (response.ok) {
        toast({
          title: "Success",
          description: "Post updated successfully"
        })
        onSuccess()
        onClose()
      } else {
        throw new Error(result.error || 'Failed to update post')
      }
    } catch (error) {
      console.error('Error updating post:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update post",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle>Edit Post</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's on your mind?"
            className="min-h-[120px] resize-none border-none focus:ring-0 text-lg"
            maxLength={280}
          />

          {/* Existing Images */}
          {existingImages.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Current images:</p>
              <div className="grid grid-cols-2 gap-2">
                {existingImages.map((imageUrl, index) => (
                  <div key={index} className="relative">
                      <Image
                        src={imageUrl}
                        alt={`Existing image ${index + 1}`}
                        width={256}
                        height={96}
                        unoptimized
                        className="w-full h-24 object-cover rounded-lg"
                      />
                    <button
                      type="button"
                      onClick={() => removeExistingImage(index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* New Images Preview */}
          {newImages.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">New images to add:</p>
              <div className="grid grid-cols-2 gap-2">
                {newImages.map((file, index) => (
                  <div key={index} className="relative">
                      <Image
                        src={URL.createObjectURL(file)}
                        alt={`New image ${index + 1}`}
                        width={256}
                        height={96}
                        unoptimized
                        className="w-full h-24 object-cover rounded-lg"
                      />
                    <button
                      type="button"
                      onClick={() => removeNewImage(index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="text-blue-500 hover:text-blue-600"
              >
                <ImageIcon size={18} />
                Add Images
              </Button>
              <span className="text-sm text-muted-foreground">
                {content.length}/280
              </span>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || (!hasText && !hasAnyImages)}
              >
                {isSubmitting ? 'Updating...' : 'Update Post'}
              </Button>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />
        </form>
      </DialogContent>
    </Dialog>
  )
}