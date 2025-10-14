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

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    
    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (e) => {
          setImages(prev => [...prev, {
            id: Date.now() + Math.random(),
            file: file,
            preview: e.target?.result as string
          }])
        }
        reader.readAsDataURL(file)
      }
    })
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
      
      // Add all images to form data if they exist
      images.forEach((image) => {
        formData.append('images', image.file)
      })

      console.log('Sending post with content:', content)
      console.log('Images count:', images.length)

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
        
        console.error('Failed to create post:', errorMessage, errorDetails, errorCode)
        
        let userMessage = `Failed to create post: ${errorMessage}`
        
        // Add helpful instructions based on error type
        if (errorCode === 'MONGODB_SSL_ERROR') {
          userMessage += '\n\nTry refreshing the page or contact support if the issue persists.'
        } else if (errorCode === 'MONGODB_AUTH_ERROR') {
          userMessage += '\n\nPlease check if MongoDB Atlas credentials are correct.'
        } else if (errorCode === 'MONGODB_TIMEOUT') {
          userMessage += '\n\nCheck your internet connection and try again.'
        } else if (errorDetails) {
          userMessage += `\n\nDetails: ${errorDetails}`
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