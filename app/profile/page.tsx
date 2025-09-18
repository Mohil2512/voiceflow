import { Layout } from "@/components/layout/Layout"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { PostCard } from "@/components/post/PostCard"
import { Card, CardContent } from "@/components/ui/card"
import { MapPin, Link as LinkIcon, Calendar, Users } from "lucide-react"

const mockUser = {
  name: "John Doe",
  username: "johndoe",
  avatar: "/placeholder.svg",
  bio: "Product Designer passionate about creating meaningful user experiences. Currently working on the future of conversational AI.",
  location: "San Francisco, CA",
  website: "johndoe.design",
  joinDate: "March 2023",
  following: 384,
  followers: 1205,
  posts: 156
}

const mockPosts = [
  {
    id: "1",
    user: mockUser,
    content: "Just finished working on a new component library for our design system. The attention to detail in micro-interactions really makes a difference in user experience. What are your thoughts on animation in UI design?",
    timestamp: "3h",
    likes: 24,
    replies: 8,
    reposts: 3,
    image: "/placeholder.svg",
  },
  {
    id: "2",
    user: mockUser,
    content: "Excited to share that our team just launched a new feature that will help thousands of users create better conversational experiences. The feedback has been incredible so far!",
    timestamp: "1d",
    likes: 67,
    replies: 12,
    reposts: 8,
  },
]

export default function ProfilePage() {
  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-6">
        {/* Profile Header */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-start gap-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src={mockUser.avatar} />
                <AvatarFallback className="text-2xl">{mockUser.name[0]}</AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h1 className="text-2xl font-bold">{mockUser.name}</h1>
                    <p className="text-muted-foreground">@{mockUser.username}</p>
                  </div>
                  <Button variant="outline">Edit Profile</Button>
                </div>
                
                <p className="text-sm mb-4">{mockUser.bio}</p>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  {mockUser.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {mockUser.location}
                    </div>
                  )}
                  {mockUser.website && (
                    <div className="flex items-center gap-1">
                      <LinkIcon className="h-4 w-4" />
                      <a href={`https://${mockUser.website}`} className="text-primary hover:underline">
                        {mockUser.website}
                      </a>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Joined {mockUser.joinDate}
                  </div>
                </div>
                
                <div className="flex items-center gap-6 text-sm">
                  <div>
                    <span className="font-semibold">{mockUser.following}</span>
                    <span className="text-muted-foreground ml-1">Following</span>
                  </div>
                  <div>
                    <span className="font-semibold">{mockUser.followers}</span>
                    <span className="text-muted-foreground ml-1">Followers</span>
                  </div>
                  <div>
                    <span className="font-semibold">{mockUser.posts}</span>
                    <span className="text-muted-foreground ml-1">Posts</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Posts */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Posts</h2>
          {mockPosts.map((post) => (
            <PostCard key={post.id} {...post} />
          ))}
        </div>
      </div>
    </Layout>
  )
}