"use client"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import Link from "next/link"
import { useTheme } from "next-themes"
import { AppSidebarLink } from "./AppSidebarLink"
import { NotificationLink } from "./NotificationLink"
import { useOptimizedNavigation } from "@/hooks/use-optimized-navigation"
import { 
  Home, 
  Search, 
  Heart, 
  MessageCircle, 
  User, 
  LogOut, 
  Sun, 
  Moon,
  PlusSquare,
  Menu,
  Monitor
} from "lucide-react"
import { cn } from "@/lib/utils"
import { CreatePostModal } from "@/components/post/CreatePostModal"

export function AppSidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [showMore, setShowMore] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const { navigateWithOptimization } = useOptimizedNavigation()

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSignOut = () => {
    signOut({ callbackUrl: "/" })
  }

  // Mobile-optimized main items (fewer items for bottom nav)
  const mobileMainItems = [
    {
      title: "Home",
      url: "/",
      icon: Home,
    },
    {
      title: "Search",
      url: "/search",
      icon: Search,
    },
    {
      title: "Create",
      url: "#",
      icon: PlusSquare,
    },
    {
      title: "Notification",
      url: "/notification",
      icon: Heart,
      requiresAuth: true
    },
    {
      title: "Profile",
      url: "/profile",
      icon: User,
      requiresAuth: true
    },
  ]

  const mainSidebarItems = [
    {
      title: "Home",
      url: "/",
      icon: Home,
    },
    {
      title: "Search",
      url: "/search",
      icon: Search,
    },
    {
      title: "Create",
      url: "#",
      icon: PlusSquare,
      onClick: () => {
        // This will be handled by the CreatePostModal component
        // The modal is opened by a different trigger
      },
    },
    {
      title: "Notification",
      url: "/notification",
      icon: Heart,
      requiresAuth: true
    },
    {
      title: "Profile",
      url: "/profile",
      icon: User,
      requiresAuth: true
    },
    {
      title: "More",
      url: "#",
      icon: Menu,
      onClick: () => setShowMore(!showMore),
    },
  ]

  const moreMenuItems = [
    {
      title: theme === "dark" ? "Dark Mode" : "Light Mode",
      url: "#",
      icon: theme === "dark" ? Sun : Moon,
      onClick: () => {
        // Toggle between dark and light modes only
        const newTheme = theme === "dark" ? "light" : "dark";
        setTheme(newTheme);
        
        // Force update the DOM directly for immediate visual feedback - fixed reversed themes
        if (newTheme === "dark") {
          document.documentElement.classList.add("dark");
          document.documentElement.classList.remove("light");
          document.documentElement.style.colorScheme = "dark";
        } else {
          document.documentElement.classList.add("light");
          document.documentElement.classList.remove("dark");
          document.documentElement.style.colorScheme = "light";
        }
        
        console.log("Changed theme to", newTheme, "from", theme);
      },
    },
    ...(session ? [{
      title: "Log Out",
      url: "#",
      icon: LogOut,
      onClick: handleSignOut,
    }] : []),
  ]

  if (!mounted) {
    return (
      <>
        {/* Desktop Loading */}
        <div className="hidden md:flex w-72 h-screen bg-background border-r border-border items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
        </div>
        {/* Mobile Loading */}
        <div className="md:hidden h-16 bg-background border-t border-border flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-foreground"></div>
        </div>
      </>
    )
  }

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-72 h-screen bg-background border-r border-border flex-col flex-shrink-0 overflow-hidden">
        <div className="flex-1 px-6 py-8 overflow-y-auto">
          <div className="mb-8 px-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center">
                <img
                  src="/logo.png"
                  alt="Voiceflow Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-xl text-foreground">Voiceflow</span>
                <span className="text-xs text-muted-foreground">by Anjaneya</span>
              </div>
            </div>
          </div>
          <nav className="space-y-1">
            {mainSidebarItems.map((item) => {
              const isActive = pathname === item.url
              
              // Special case for Create button
              if (item.title === "Create") {
                return (
                  <CreatePostModal 
                    key={item.title}
                    trigger={
                      <button
                        className={cn(
                          "flex items-center gap-4 rounded-xl px-4 py-3 text-left transition-colors w-full",
                          "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        )}
                      >
                        <item.icon className="h-7 w-7 stroke-1" />
                        <span className="text-xl font-normal">{item.title}</span>
                      </button>
                    }
                  />
                )
              }
              
              // Special handling for notification
              if (item.title === "Notification") {
                return <NotificationLink key={item.title} isActive={isActive} />;
              }
              
              return item.onClick ? (
                // Use button for items with onClick handlers (like More)
                <button
                  key={item.title}
                  onClick={item.onClick}
                  className={cn(
                    "flex items-center gap-4 rounded-xl px-4 py-3 text-left transition-colors w-full",
                    isActive
                      ? "bg-accent text-accent-foreground font-medium"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <item.icon className={cn("h-7 w-7", isActive ? "stroke-2" : "stroke-1")} />
                  <span className="text-xl font-normal">{item.title}</span>
                </button>
              ) : (
                // Use AppSidebarLink for navigation items to handle auth requirements
                <AppSidebarLink
                  key={item.title}
                  title={item.title}
                  url={item.url}
                  icon={item.icon}
                  isActive={isActive}
                  requiresAuth={item.requiresAuth}
                />
              )
            })}
          </nav>
          
          {/* More Menu Dropdown */}
          {showMore && (
            <div className="mt-2 space-y-1 ml-4 border-l-2 border-border pl-4">
              {moreMenuItems.map((item) => (
                <button
                  key={item.title}
                  onClick={item.onClick}
                  className="flex items-center gap-4 rounded-xl px-4 py-3 text-left transition-colors w-full text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                >
                  <item.icon className="h-6 w-6" />
                  <span className="text-lg font-normal">{item.title}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden h-16 bg-background border-t border-border flex items-center justify-around px-2">
        {mobileMainItems.map((item) => {
          const isActive = pathname === item.url
          
          // Special case for Create button
          if (item.title === "Create") {
            return (
              <CreatePostModal 
                key={item.title}
                trigger={
                  <button
                    className="flex flex-col items-center gap-1 p-2 rounded-lg transition-colors hover:bg-accent"
                  >
                    <item.icon className="h-6 w-6 stroke-1 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{item.title}</span>
                  </button>
                }
              />
            )
          }
          
          // Regular navigation items
          return (
            <AppSidebarLink
              key={item.title}
              title={item.title}
              url={item.url}
              icon={item.icon}
              isActive={isActive}
              requiresAuth={item.requiresAuth}
              isMobile={true}
            />
          )
        })}
      </div>
    </>
  )
}
