"use client"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import Image from "next/image"
import { useTheme } from "next-themes"
import { AppSidebarLink } from "./AppSidebarLink"
import { NotificationLink } from "./NotificationLink"
import { 
  Home, 
  Search, 
  Heart, 
  User, 
  LogOut, 
  Sun, 
  Moon,
  PlusSquare,
  Menu,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight
} from "lucide-react"
import { cn } from "@/lib/utils"
import { CreatePostModal } from "@/components/post/CreatePostModal"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

// Separate Theme Toggle Component
export function ThemeToggle({ mobile = false }: { mobile?: boolean }) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  const handleThemeChange = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    
    // Force update the DOM directly for immediate visual feedback
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
      document.documentElement.style.colorScheme = "dark";
    } else {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
      document.documentElement.style.colorScheme = "light";
    }
  }

  if (mobile) {
    return (
      <button
        onClick={handleThemeChange}
        className="p-2 rounded-lg transition-colors hover:bg-accent"
        aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      >
        {theme === "dark" ? (
          <Sun className="h-5 w-5 text-muted-foreground" />
        ) : (
          <Moon className="h-5 w-5 text-muted-foreground" />
        )}
      </button>
    )
  }

  return (
    <button
      onClick={handleThemeChange}
      className="flex flex-col items-center gap-1 p-2 rounded-lg transition-colors hover:bg-accent"
    >
      {theme === "dark" ? (
        <Sun className="h-5 w-5 text-muted-foreground" />
      ) : (
        <Moon className="h-5 w-5 text-muted-foreground" />
      )}
      <span className="text-xs text-muted-foreground">{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
    </button>
  )
}

interface AppSidebarProps {
  collapsed?: boolean
  onToggleCollapse?: () => void
}

export function AppSidebar({ collapsed = false, onToggleCollapse }: AppSidebarProps = {}) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [showMore, setShowMore] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (collapsed) {
      setShowMore(false)
    }
  }, [collapsed])

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

  const getCurrentThemeLabel = () => (theme === "dark" ? "Light Mode" : "Dark Mode")

  const moreMenuItems = [
    {
      title: getCurrentThemeLabel(),
      url: "#",
      icon: theme === "dark" ? Sun : Moon,
      onClick: () => {
        // Toggle between dark and light modes only
        const newTheme = theme === "dark" ? "light" : "dark";
        setTheme(newTheme);
        
        // Force update the DOM directly for immediate visual feedback
        if (newTheme === "dark") {
          document.documentElement.classList.add("dark");
          document.documentElement.classList.remove("light");
          document.documentElement.style.colorScheme = "dark";
        } else {
          document.documentElement.classList.add("light");
          document.documentElement.classList.remove("dark");
          document.documentElement.style.colorScheme = "light";
        }
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
      <div
        className={cn(
          "hidden md:flex h-screen bg-background border-r border-border flex-col flex-shrink-0 overflow-hidden transition-[width] duration-200",
          collapsed ? "w-20" : "w-72"
        )}
      >
        <div className={cn("flex-1 overflow-y-auto", collapsed ? "px-3 py-8" : "px-6 py-8")}>        
          <div className={cn("mb-8", collapsed ? "flex justify-center" : "px-2")}>          
            <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center">
                <Image
                  src="/logo.png"
                  alt="Voiceflow Logo"
                  width={40}
                  height={40}
                  className="w-full h-full object-contain"
                  priority
                />
              </div>
              {!collapsed && (
                <div className="flex flex-col">
                  <span className="font-bold text-xl text-foreground">Voiceflow</span>
                  <span className="text-xs text-muted-foreground">by Anjaneya</span>
                </div>
              )}
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
                          "flex items-center rounded-xl transition-colors w-full",
                          collapsed ? "justify-center gap-0 px-2 py-3" : "gap-4 px-4 py-3",
                          "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        )}
                        title={collapsed ? item.title : undefined}
                      >
                        <item.icon className={cn("stroke-1", collapsed ? "h-7 w-7" : "h-7 w-7")} />
                        {!collapsed && <span className="text-xl font-normal">{item.title}</span>}
                      </button>
                    }
                  />
                )
              }
              
              // Special handling for notification
              if (item.title === "Notification") {
                return <NotificationLink key={item.title} isActive={isActive} collapsed={collapsed} />;
              }
              
              return item.onClick ? (
                // Use button for items with onClick handlers (like More)
                <button
                  key={item.title}
                  onClick={item.onClick}
                  className={cn(
                    "flex items-center rounded-xl text-left transition-colors w-full",
                    collapsed ? "justify-center gap-0 px-2 py-3" : "gap-4 px-4 py-3",
                    isActive
                      ? "bg-accent text-accent-foreground font-medium"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                  title={collapsed ? item.title : undefined}
                >
                  <item.icon className={cn("h-7 w-7", isActive ? "stroke-2" : "stroke-1")} />
                  {!collapsed && <span className="text-xl font-normal">{item.title}</span>}
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
                  collapsed={collapsed}
                />
              )
            })}
          </nav>
          
          {/* More Menu Dropdown */}
          {showMore && (
            <div className={cn("mt-2 space-y-1", collapsed ? "px-2" : "ml-4 border-l-2 border-border pl-4")}>             
              {moreMenuItems.map((item) => (
                <button
                  key={item.title}
                  onClick={item.onClick}
                  className={cn(
                    "flex items-center rounded-xl text-left transition-colors w-full text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    collapsed ? "justify-center gap-0 px-2 py-3" : "gap-4 px-4 py-3"
                  )}
                  title={collapsed ? item.title : undefined}
                >
                  <item.icon className="h-6 w-6" />
                  {!collapsed && <span className="text-lg font-normal">{item.title}</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {onToggleCollapse && (
          <div className={cn("border-t border-border", collapsed ? "px-3 py-4" : "px-6 py-4")}>          
            <button
              onClick={onToggleCollapse}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              <span className={collapsed ? "sr-only" : undefined}>{collapsed ? "Expand sidebar" : "Collapse sidebar"}</span>
            </button>
          </div>
        )}
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
        
        {/* More Button with Sheet */}
        <Sheet>
          <SheetTrigger asChild>
            <button className="flex flex-col items-center gap-1 p-2 rounded-lg transition-colors hover:bg-accent">
              <MoreHorizontal className="h-6 w-6 stroke-1 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">More</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-auto rounded-t-3xl">
            <SheetHeader className="text-left mb-4">
              <SheetTitle>Settings</SheetTitle>
            </SheetHeader>
            <div className="space-y-2">
              {moreMenuItems.map((item) => (
                <button
                  key={item.title}
                  onClick={item.onClick}
                  className="flex items-center gap-4 rounded-xl px-4 py-4 text-left transition-colors w-full hover:bg-accent"
                >
                  <item.icon className="h-6 w-6 text-foreground" />
                  <span className="text-base font-medium text-foreground">{item.title}</span>
                </button>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  )
}
