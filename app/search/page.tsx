import { Layout } from "@/components/layout/Layout"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search as SearchIcon } from "lucide-react"

export default function SearchPage() {
  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">Search</h1>
          <p className="text-muted-foreground mb-6">Discover posts, people, and topics</p>
          
          <div className="flex gap-2 max-w-md">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search for posts, users, or topics..." 
                className="pl-10"
              />
            </div>
            <Button>Search</Button>
          </div>
        </div>
        
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Recent Searches</h2>
            <div className="text-muted-foreground">No recent searches</div>
          </div>
          
          <div>
            <h2 className="text-xl font-semibold mb-4">Trending Topics</h2>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm">#voiceflow</Button>
              <Button variant="outline" size="sm">#design</Button>
              <Button variant="outline" size="sm">#technology</Button>
              <Button variant="outline" size="sm">#community</Button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}