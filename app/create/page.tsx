import { Layout } from "@/components/layout/Layout"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { ImageIcon, Smile, MapPin, Calendar } from "lucide-react"

export default function CreatePage() {
  return (
    <Layout>
      <div className="max-w-2xl mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex gap-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src="/placeholder.svg" />
                <AvatarFallback>U</AvatarFallback>
              </Avatar>
              
              <div className="flex-1 space-y-4">
                <Textarea 
                  placeholder="What's happening?" 
                  className="min-h-[120px] resize-none border-none p-0 text-xl placeholder:text-muted-foreground focus-visible:ring-0"
                />
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-primary">
                    <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                      <ImageIcon className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                      <Smile className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                      <MapPin className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                      <Calendar className="h-5 w-5" />
                    </Button>
                  </div>
                  
                  <Button>Post</Button>
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