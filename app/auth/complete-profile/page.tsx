"use client"

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar, User, Phone, Users } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'

export default function CompleteProfilePage() {
  const { data: session, status, update } = useSession()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [missingFields, setMissingFields] = useState<string[]>([])
  const [formData, setFormData] = useState({
    phoneNumber: '',
    username: '',
    bio: '', // Optional field
    avatar: '' // Optional field - base64 data URL
  })

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'loading') return

    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }

    if (session?.user) {
      // Check which fields are missing - only phone number and username are mandatory
      const missing: string[] = []
      const user = session.user as any

      if (!user.phoneNumber) missing.push('phoneNumber')
      if (!user.username) missing.push('username')

      // If profile is already complete, redirect to home
      if (missing.length === 0) {
        router.push('/')
        return
      }

      setMissingFields(missing)
      
      // Pre-fill any existing data
      setFormData({
        phoneNumber: user.phoneNumber || '',
        username: user.username || '',
        bio: user.bio || '', // Optional
        avatar: user.image || '' // Optional
      })
    }
  }, [session, status, router])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
    setError('') // Clear error when user starts typing
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0]
    if (!file) return

    // Small client-side validation
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      setFormData({ ...formData, avatar: result })
      setAvatarPreview(result)
      setError('')
    }
    reader.onerror = () => setError('Failed to read image file')
    reader.readAsDataURL(file)
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData({
      ...formData,
      [name]: value
    })
    setError('')
  }

  const validateForm = () => {
    // Check username if it's required
    if (missingFields.includes('username') && !formData.username.trim()) {
      setError('Username is required')
      return false
    }
    if (formData.username && formData.username.length < 3) {
      setError('Username must be at least 3 characters')
      return false
    }
    if (formData.username && !/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      setError('Username can only contain letters, numbers, and underscores')
      return false
    }

    // Check phone number if it's required
    if (missingFields.includes('phoneNumber') && !formData.phoneNumber.trim()) {
      setError('Phone number is required')
      return false
    }

    // Phone number format validation if provided
    if (formData.phoneNumber) {
      const phoneRegex = /^\+?[\d\s\-\(\)\.]{10,}$/
      if (!phoneRegex.test(formData.phoneNumber)) {
        setError('Please enter a valid phone number')
        return false
      }
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setIsLoading(true)
    setError('')

    try {
      console.log('Submitting profile completion for user:', session?.user?.id)
      console.log('Session user data:', session?.user)
      
      // Update profile with missing information
      const response = await fetch('/api/auth/complete-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: session?.user?.id,
          ...formData
        }),
      })

      const data = await response.json()
      console.log('Profile completion response:', data)

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update profile')
      }

      console.log('Profile completion successful, updating session...')

      // Update session with the new profile data directly
      await update({
        user: {
          ...session?.user,
          ...formData,
          profileComplete: data.profileComplete || true
        }
      })

      // Redirect to main home page (not dashboard)
      router.push('/')

    } catch (error: any) {
      console.error('Profile completion error:', error)
      setError(error.message || 'An error occurred while updating your profile')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSkipForNow = async () => {
    // Update the session to mark as skipped (but not complete)
    await update({
      ...session,
      user: {
        ...session?.user,
        profileComplete: false // Keep as incomplete but allow access
      }
    })
    
    // Redirect to dashboard
    router.push('/dashboard')
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (missingFields.length === 0) {
    return null // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md space-y-6">
        {/* Logo and Title */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <Logo className="h-12 w-12 text-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Complete Your Profile</h1>
            <p className="text-muted-foreground">
              Please provide some additional information to get started
            </p>
          </div>
        </div>

        <Card className="border-border">
          <CardHeader>
            <CardTitle>Just a few more details</CardTitle>
            <CardDescription>
              Welcome {session?.user?.name}! We need a bit more information to personalize your experience.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Error Alert */}
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Profile Completion Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username */}
              {missingFields.includes('username') && (
                <div className="space-y-2">
                  <Label htmlFor="username" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Username
                  </Label>
                  <Input
                    id="username"
                    name="username"
                    type="text"
                    placeholder="Choose a unique username"
                    value={formData.username}
                    onChange={handleInputChange}
                    required
                    disabled={isLoading}
                  />
                  <p className="text-xs text-muted-foreground">
                    This will be your unique identifier on the platform
                  </p>
                </div>
              )}

              {/* Phone Number */}
              {missingFields.includes('phoneNumber') && (
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber" className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Phone Number
                  </Label>
                  <Input
                    id="phoneNumber"
                    name="phoneNumber"
                    type="tel"
                    placeholder="Enter your phone number"
                    value={formData.phoneNumber}
                    onChange={handleInputChange}
                    required
                    disabled={isLoading}
                  />
                  <p className="text-xs text-muted-foreground">
                    For account security and notifications
                  </p>
                </div>
              )}

              {/* Bio - Optional field */}
              <div className="space-y-2">
                <Label htmlFor="bio" className="flex items-center gap-2">
                  Bio
                  <span className="text-xs text-muted-foreground">(Optional)</span>
                </Label>
                <textarea
                  id="bio"
                  name="bio"
                  placeholder="Tell us a bit about yourself..."
                  value={formData.bio}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  rows={3}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              {/* Avatar / Profile picture */}
              <div className="space-y-2">
                <Label htmlFor="avatar" className="flex items-center gap-2">
                  Profile picture
                  <span className="text-xs text-muted-foreground">(Optional)</span>
                </Label>
                <input
                  id="avatar"
                  name="avatar"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  disabled={isLoading}
                  className="mt-1"
                />
                {avatarPreview && (
                  <img src={avatarPreview} alt="Avatar preview" className="mt-2 h-20 w-20 rounded-full object-cover" />
                )}
                <p className="text-xs text-muted-foreground">You can upload or change your profile picture now.</p>
              </div>

              <div className="flex flex-col gap-2 pt-4">
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading}
                >
                  {isLoading ? 'Updating Profile...' : 'Complete Profile'}
                </Button>
                
                <Button 
                  type="button"
                  variant="ghost"
                  className="w-full" 
                  onClick={handleSkipForNow}
                  disabled={isLoading}
                >
                  Skip for now
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Privacy Note */}
        <div className="text-xs text-center text-muted-foreground">
          Your information is secure and will be used according to our{' '}
          <a href="/privacy" className="hover:underline text-primary">
            Privacy Policy
          </a>
        </div>
      </div>
    </div>
  )
}