import { PostCard } from "@/components/post/PostCard"
import { Layout } from "@/components/layout/Layout"

const mockPosts = [
  {
    id: "1",
    user: {
      name: "Seattle Kraken",
      username: "seattlekraken",
      avatar: "/placeholder.svg",
      verified: true,
    },
    content: "we took care of your plans for the next few weeks, you're welcome! 🙂‍↕️join us alllllll week long at Kraken Community Iceplex for Military Day, Kids Day, and so much more at Kraken Training Camp, pres. by @Starbucks !",
    timestamp: "15h",
    likes: 17,
    replies: 3,
    reposts: 2,
    image: "/placeholder.svg",
  },
  {
    id: "2",
    user: {
      name: "TrendSpider",
      username: "trendspider",
      avatar: "/placeholder.svg",
      verified: false,
    },
    content: "$IONQ announces plans to acquire Vector Atomic, a leader in quantum sensing.\n\nThe stock is now up +50% in the last two weeks. 🚀",
    timestamp: "13h",
    likes: 25,
    replies: 8,
    reposts: 5,
  },
  {
    id: "3",
    user: {
      name: "John Doe",
      username: "johndoe",
      avatar: "/placeholder.svg",
      verified: false,
    },
    content: "Just discovered this amazing new coffee shop downtown ☕️ The atmosphere is perfect for getting work done!",
    timestamp: "2h",
    likes: 5,
    replies: 2,
    reposts: 1,
  },
]

export default function Home() {
  return (
    <Layout>
      <div className="flex-1 max-w-2xl mx-auto border-x border-border min-h-screen">
        <div className="sticky top-0 bg-background/80 backdrop-blur-md border-b border-border p-4">
          <h1 className="text-xl font-bold text-foreground">Home</h1>
        </div>
        
        <div>
          {mockPosts.map((post) => (
            <PostCard key={post.id} {...post} />
          ))}
        </div>
      </div>
    </Layout>
  )
}