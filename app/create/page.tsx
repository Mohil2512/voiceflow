"use client"

import { useState, useRef } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Layout } from "@/components/layout/Layout"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { ImageIcon, Smile, MapPin, Calendar, X } from "lucide-react"

export default function CreatePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [content, setContent] = useState("")
  const [images, setImages] = useState<{id: number, file: File, preview: string}[]>([])
  const [location, setLocation] = useState("")
  const [isPosting, setIsPosting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (status === "loading") {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto p-6 flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
        </div>
      </Layout>
    )
  }

  if (!session) {
    router.push("/auth/signin")
    return null
  }

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

  const removeImage = (imageId) => {
    setImages(prev => prev.filter(img => img.id !== imageId))
  }

  const handlePost = async () => {
    if (!content.trim() && images.length === 0) return

    setIsPosting(true)
    try {
      const formData = new FormData()
      formData.append('content', content)
      formData.append('location', location)
      
      images.forEach((image, index) => {
        formData.append('images', image.file)
      })

      const response = await fetch('/api/posts/create', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        router.push('/')
      } else {
        console.error('Failed to create post')
      }
    } catch (error) {
      console.error('Error creating post:', error)
    } finally {
      setIsPosting(false)
    }
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex gap-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={session?.user?.image || "/placeholder.svg"} />
                <AvatarFallback>{session?.user?.name?.[0] || "U"}</AvatarFallback>
              </Avatar>
              
              <div className="flex-1 space-y-4">
                <Textarea 
                  placeholder="What's happening?" 
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="min-h-[120px] resize-none border-none p-0 text-xl placeholder:text-muted-foreground focus-visible:ring-0"
                />

                {/* Location Input */}
                {location !== "" && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <input
                      type="text"
                      placeholder="Add location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="bg-transparent border-none outline-none flex-1"
                    />
                    <button onClick={() => setLocation("")} className="text-muted-foreground hover:text-foreground">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {/* Image Preview */}
                {images.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 max-h-80 overflow-y-auto">
                    {images.map((image) => (
                      <div key={image.id} className="relative group">
                        <img 
                          src={image.preview} 
                          alt="Upload preview" 
                          className="w-full h-32 object-cover rounded-lg"
                        />
                        <button
                          onClick={() => removeImage(image.id)}
                          className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
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
                    <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                      <Smile className="h-5 w-5" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-9 w-9 p-0"
                      onClick={() => setLocation(location === "" ? " " : "")}
                    >
                      <MapPin className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                      <Calendar className="h-5 w-5" />
                    </Button>
                  </div>
                  
                  <Button 
                    onClick={handlePost} 
                    disabled={(!content.trim() && images.length === 0) || isPosting}
                  >
                    {isPosting ? "Posting..." : "Post"}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>Your post will be visible to all users in the community</p>
        </div>
      </div>
    </Layout>
  )
}