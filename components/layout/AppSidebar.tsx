"use client"

import React, { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  Home, 
  Search, 
  Plus, 
  Heart, 
  User, 
  Menu,
  Sun,
  Moon,
  Monitor
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { useTheme } from "@/providers/theme-provider"
import { cn } from "@/lib/utils"
import { Logo } from "@/components/ui/Logo"

const sidebarItems = [
  { title: "Home", url: "/", icon: Home },
  { title: "Search", url: "/search", icon: Search },
  { title: "Create", url: "/create", icon: Plus },
  { title: "Activity", url: "/activity", icon: Heart },
  { title: "Profile", url: "/profile", icon: User },
]

const themeIcons = {
  light: Sun,
  dark: Moon,
  system: Monitor,
}

export function AppSidebar() {
  const { theme, setTheme } = useTheme()
  const [showMore, setShowMore] = useState(false)
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const handleThemeChange = () => {
    if (theme === "light") setTheme("dark")
    else if (theme === "dark") setTheme("system")
    else setTheme("light")
  }

  // Get current theme with fallback, ensuring theme icon works immediately
  const currentTheme = theme || "system"
  const ThemeIcon = themeIcons[currentTheme as keyof typeof themeIcons] || Monitor
  
  // Get theme label with proper fallback
  const getThemeLabel = () => {
    switch (currentTheme) {
      case "light": return "Light"
      case "dark": return "Dark" 
      default: return "System"
    }
  }

  return (
    <Sidebar className="border-r border-border w-64">
      <SidebarContent className="px-4 py-6">
        {/* Logo */}
        <div className="mb-8 px-2">
          <div className="flex items-center gap-3">
            <Logo className="h-8 w-8 text-foreground" />
            <div className="flex flex-col">
              <span className="font-bold text-xl text-foreground">voiceflow</span>
              <span className="text-xs text-muted-foreground">by Anjaneya</span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2">
              {sidebarItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild size="lg" className="hover:bg-accent">
                    <Link
                      href={item.url}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-3 transition-colors",
                        pathname === item.url
                          ? "bg-accent text-accent-foreground font-medium" 
                          : "text-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <item.icon className="h-6 w-6" />
                      <span className="text-base">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* More Section */}
        <div className="mt-8">
          <Button
            variant="ghost"
            onClick={() => setShowMore(!showMore)}
            className="w-full justify-start gap-3 px-3 py-3 h-auto text-base hover:bg-accent"
          >
            <Menu className="h-6 w-6" />
            More
          </Button>
          
          {showMore && (
            <div className="mt-2 space-y-2 pl-9">
              <Button
                variant="ghost"
                onClick={handleThemeChange}
                className="w-full justify-start gap-3 px-3 py-2 h-auto text-sm hover:bg-accent"
              >
                <ThemeIcon className="h-4 w-4" />
                {getThemeLabel()}
              </Button>
            </div>
          )}
        </div>
      </SidebarContent>
    </Sidebar>
  )
}