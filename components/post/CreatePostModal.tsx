"use client"

import { useState, useRef, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ImageIcon, Smile, X } from "lucide-react"
import Image from "next/image"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface CreatePostModalProps {
  trigger?: React.ReactNode;
  onPostCreated?: () => void;
}

type CurrentUserSummary = {
  name?: string | null
  image?: string | null
}

export function CreatePostModal({ trigger, onPostCreated }: CreatePostModalProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [content, setContent] = useState("")
  const [images, setImages] = useState<{id: number, file: File, preview: string}[]>([])
  const [isPosting, setIsPosting] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<CurrentUserSummary | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Fetch current user data including profile picture
  useEffect(() => {
    const fetchCurrentUser = async () => {
      if (session?.user?.email) {
        try {
          const response = await fetch('/api/users/me')
          if (response.ok) {
            const data = await response.json() as { user?: CurrentUserSummary }
            if (data.user) {
              setCurrentUser(data.user)
            }
          }
        } catch (error) {
          console.error('Error fetching current user:', error)
        }
      }
    }
    
    fetchCurrentUser()
  }, [session?.user?.email])

  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new window.Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          let width = img.width
          let height = img.height
          
          // Resize if image is too large
          const MAX_WIDTH = 1920
          const MAX_HEIGHT = 1920
          
          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width
              width = MAX_WIDTH
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height
              height = MAX_HEIGHT
            }
          }
          
          canvas.width = width
          canvas.height = height
          
          const ctx = canvas.getContext('2d')
          ctx?.drawImage(img, 0, 0, width, height)
          
          // Convert to blob with quality compression
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                })
                resolve(compressedFile)
              } else {
                reject(new Error('Canvas to Blob conversion failed'))
              }
            },
            'image/jpeg',
            0.8 // 80% quality
          )
        }
        img.onerror = reject
        img.src = e.target?.result as string
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    
    for (const file of files) {
      if (file.type.startsWith('image/')) {
        try {
          // Compress the image before adding
          const compressedFile = await compressImage(file)
          console.log(`Original size: ${(file.size / 1024).toFixed(2)}KB, Compressed size: ${(compressedFile.size / 1024).toFixed(2)}KB`)
          
          const reader = new FileReader()
          reader.onload = (e) => {
            setImages(prev => [...prev, {
              id: Date.now() + Math.random(),
              file: compressedFile,
              preview: e.target?.result as string
            }])
          }
          reader.readAsDataURL(compressedFile)
        } catch (error) {
          console.error('Error compressing image:', error)
          alert('Failed to process image. Please try a different image.')
        }
      }
    }
  }

  const removeImage = (imageId: number) => {
    setImages(prev => prev.filter(img => img.id !== imageId))
  }

  const resetForm = () => {
    setContent("")
    setImages([])
    setIsPosting(false)
  }

  const handlePost = async () => {
    if (!content.trim() && images.length === 0) return

    setIsPosting(true)
    try {
      const formData = new FormData()
      formData.append('content', content)
      
      // Calculate total size and warn if too large
      let totalSize = 0
      images.forEach((image) => {
        totalSize += image.file.size
        formData.append('images', image.file)
      })
      
      // Vercel has a 4.5MB limit for serverless function body
      const MAX_BODY_SIZE = 4 * 1024 * 1024 // 4MB to be safe
      if (totalSize > MAX_BODY_SIZE) {
        alert(`Images are too large (${(totalSize / 1024 / 1024).toFixed(2)}MB). Please reduce the number of images or try smaller files.`)
        setIsPosting(false)
        return
      }

      console.log('Sending post with content:', content)
      console.log('Images count:', images.length)
      console.log('Total payload size:', (totalSize / 1024).toFixed(2), 'KB')

      // Create a temporary local post to display immediately
      const tempPost = {
        id: `temp-${Date.now()}`,
        content,
        user: {
          name: session?.user?.name || 'You',
          username: session?.user?.username || session?.user?.email?.split('@')[0] || 'you',
          avatar: session?.user?.image || '',
        },
        timestamp: 'Just now',
        likes: 0,
        replies: 0,
        reposts: 0,
        createdAt: new Date().toISOString()
      }

      // Add the temporary post to local storage for immediate display
      try {
        const localPosts = localStorage.getItem('voiceflow-home-posts') || '{"data":[],"timestamp":0}'
        const parsedCache = JSON.parse(localPosts)
        const updatedPosts = [tempPost, ...(parsedCache.data || [])]
        const newCache = {
          data: updatedPosts,
          timestamp: Date.now()
        }
        localStorage.setItem('voiceflow-home-posts', JSON.stringify(newCache))
      } catch (e) {
        console.error('Error updating local cache:', e)
      }

      const response = await fetch('/api/posts/create', {
        method: 'POST',
        body: formData,
      })

      const responseData = await response.json().catch(() => ({}))

      if (response.ok) {
        console.log('Post created successfully:', responseData)
        setIsOpen(false)
        resetForm()
        
        // Clear cache to force refresh on next data fetch
        localStorage.removeItem('voiceflow-home-posts')
        
        if (onPostCreated) {
          onPostCreated()
        } else {
          router.refresh() // Refresh the page to show new post
        }
      } else {
        const errorMessage = responseData.error || response.statusText || 'Unknown error'
        const errorDetails = responseData.details || ''
        const errorCode = responseData.code || ''
        
        console.error('Failed to create post:', {
          status: response.status,
          message: errorMessage,
          details: errorDetails,
          code: errorCode,
          fullResponse: responseData
        })
        
        let userMessage = errorMessage
        
        // Add helpful instructions based on error type
        if (errorCode === 'CLOUDINARY_CONFIG_MISSING') {
          userMessage = 'Image uploads are not available. Please try posting without images.'
        } else if (errorCode === 'CLOUDINARY_UPLOAD_FAILED') {
          userMessage = `Failed to upload image: ${errorDetails || 'Unknown error'}`
        } else if (errorCode === 'IMAGE_PROCESSING_FAILED') {
          userMessage = `Unable to process image: ${errorDetails || 'Unknown error'}`
        } else if (errorCode === 'MONGODB_SSL_ERROR') {
          userMessage = 'Database connection error. Try refreshing the page.'
        } else if (errorCode === 'MONGODB_AUTH_ERROR') {
          userMessage = 'Authentication error. Please contact support.'
        } else if (errorCode === 'MONGODB_TIMEOUT') {
          userMessage = 'Connection timeout. Check your internet and try again.'
        } else if (errorDetails) {
          userMessage = `${errorMessage}: ${errorDetails}`
        }
        
        alert(userMessage)
      }
    } catch (error) {
      console.error('Error creating post:', error)
      alert('An error occurred while creating your post. Please try again.')
    } finally {
      setIsPosting(false)
    }
  }

  if (!session) {
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">New Post</Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md md:max-w-xl">
        <DialogHeader>
          <DialogTitle>New thread</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Share what&apos;s happening with your followers.
          </p>
        </DialogHeader>
        <div className="flex gap-4 mt-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={currentUser?.image || session?.user?.image || "/placeholder.svg"} />
            <AvatarFallback>{(currentUser?.name || session?.user?.name)?.[0] || "U"}</AvatarFallback>
          </Avatar>
          
          <div className="flex-1 space-y-4">
            <textarea 
              id="post-content-area"
              placeholder="What&apos;s new?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[120px] resize-none border-none p-0 text-lg placeholder:text-muted-foreground focus-visible:ring-0 w-full bg-transparent"
            />

            {/* Image Preview */}
            {images.length > 0 && (
              <div className="grid grid-cols-2 gap-2 max-h-80 overflow-y-auto">
                {images.map((image) => (
                  <div key={image.id} className="relative group">
                    <Image 
                      src={image.preview} 
                      alt="Upload preview" 
                      width={256}
                      height={128}
                      unoptimized
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => removeImage(image.id)}
                      className="absolute top-2 right-2 bg-background/60 text-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-primary">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  multiple
                  accept="image/*"
                  className="hidden"
                />
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-9 w-9 p-0"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImageIcon className="h-5 w-5" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-9 w-9 p-0"
                  onClick={() => {
                    // Method to properly trigger the system emoji picker on Windows
                    if (navigator.platform.includes('Win')) {
                      // Create a virtual keyboard event for Windows key + period
                      try {
                        // Focus on the content area before triggering emoji picker
                        const textArea = document.getElementById('post-content-area');
                        if (textArea) {
                          textArea.focus();
                          
                          // For Windows, we can't programmatically trigger Win+. 
                          // Instead, inform the user to use the shortcut
                          alert("Please use Windows key + . to open the emoji picker");
                        }
                      } catch (error) {
                        console.error("Failed to trigger emoji picker:", error);
                      }
                    } else {
                      // For Mac/other OS - use existing approach
                      // Create a contenteditable element to capture emoji input
                      const tempInput = document.createElement('div');
                      tempInput.contentEditable = 'true';
                      tempInput.style.position = 'fixed';
                      tempInput.style.left = '-999px';
                      document.body.appendChild(tempInput);
                      tempInput.focus();
                      
                      // Try to trigger emoji keyboard on Mac (Cmd + Ctrl + Space)
                      document.execCommand('insertText', false, ' ');
                      
                      // Set up a listener to capture the selected emoji
                      tempInput.addEventListener('input', () => {
                        const emoji = tempInput.textContent || '';
                        if (emoji) {
                          setContent(prev => prev + emoji);
                        }
                        document.body.removeChild(tempInput);
                      });
                      
                      // Clean up if focus is lost
                      tempInput.addEventListener('blur', () => {
                        if (document.body.contains(tempInput)) {
                          document.body.removeChild(tempInput);
                        }
                      });
                    }
                  }}
                >
                  <Smile className="h-5 w-5" />
                </Button>
              </div>
              
              <Button 
                onClick={handlePost} 
                disabled={(!content.trim() && images.length === 0) || isPosting}
                className="relative"
              >
                {isPosting ? (
                  <>
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent mr-2 align-[-2px]"></span>
                    Posting...
                  </>
                ) : "Post"}
              </Button>
            </div>
          </div>
        </div>
        
        <div className="text-center text-xs text-muted-foreground mt-2">
          <p>Your post will be visible to all users in the community</p>
        </div>
      </DialogContent>
    </Dialog>
  )
}