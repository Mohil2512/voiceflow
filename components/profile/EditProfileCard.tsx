"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { X, Camera, Loader2 } from "lucide-react"

interface EditProfileCardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentUser: {
    name: string
    username: string
    avatar: string
    bio: string
  }
}

export function EditProfileCard({ 
  open, 
  onOpenChange, 
  currentUser 
}: EditProfileCardProps) {
  const { data: session, update: updateSession } = useSession()
  const router = useRouter()
  
  const [name, setName] = useState(currentUser.name)
  const [username, setUsername] = useState(currentUser.username)
  const [bio, setBio] = useState(currentUser.bio)
  const [avatar, setAvatar] = useState(currentUser.avatar)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Check file size (limit to 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Image too large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive"
      })
      return
    }

    // Preview image
    const reader = new FileReader()
    reader.onload = () => {
      setAvatarPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
    setAvatarFile(file)
  }

  const removeImage = () => {
    setAvatarPreview(null)
    setAvatarFile(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Create a FormData object to send the data including the image file
      const formData = new FormData()
      formData.append('name', name)
      formData.append('username', username)
      formData.append('bio', bio)
      
      // Only append avatar file if one was selected
      if (avatarFile) {
        formData.append('avatar', avatarFile)
      }

      // Call the API to update profile
      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to update profile')
      }

      // Update the session with new user data
      if (session) {
        await updateSession({
          ...session,
          user: {
            ...session.user,
            name,
            username,
            image: avatarPreview || avatar
          }
        })
      }

      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully",
      })

      // Close dialog and refresh page
      onOpenChange(false)
      router.refresh()
    } catch (error) {
      console.error('Error updating profile:', error)
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Failed to update profile",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col items-center mb-6">
            <div className="relative mb-4">
              <Avatar className="h-24 w-24">
                <AvatarImage src={avatarPreview || avatar} />
                <AvatarFallback className="text-2xl">
                  {name[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div className="absolute bottom-0 right-0">
                <Label htmlFor="avatar-upload" className="cursor-pointer">
                  <div className="bg-primary hover:bg-primary/90 text-primary-foreground h-8 w-8 rounded-full flex items-center justify-center">
                    <Camera className="h-4 w-4" />
                  </div>
                </Label>
                <Input 
                  id="avatar-upload" 
                  type="file" 
                  accept="image/*" 
                  className="sr-only" 
                  onChange={handleImageUpload}
                />
              </div>
            </div>
            
            {avatarPreview && (
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                className="flex items-center gap-1"
                onClick={removeImage}
              >
                <X className="h-3 w-3" /> Remove photo
              </Button>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input 
              id="name" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              maxLength={50}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input 
              id="username" 
              value={username} 
              onChange={(e) => setUsername(e.target.value.trim().toLowerCase().replace(/[^a-z0-9_]/g, ''))} 
              maxLength={15}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea 
              id="bio" 
              value={bio} 
              onChange={(e) => setBio(e.target.value)} 
              maxLength={160}
              placeholder="Tell others about yourself (optional)"
              className="resize-none"
              rows={3}
            />
            <div className="text-xs text-muted-foreground text-right">
              {bio.length}/160
            </div>
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}