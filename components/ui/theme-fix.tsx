"use client"

import { useTheme } from "next-themes"
import { useEffect } from "react"

// More direct fix for theme applying correctly
export default function ThemeFix() {
  const { theme, setTheme } = useTheme()

  // This effect ensures the correct theme is applied
  useEffect(() => {
    // Convert any system theme to dark (default)
    if (theme === "system") {
      setTheme("dark")
    }
    
    // Force a re-render with the correct theme - fix reversed themes
    if (theme === "dark") {
      document.documentElement.classList.add("dark")
      document.documentElement.classList.remove("light")
      document.documentElement.style.colorScheme = "dark"
    } else {
      document.documentElement.classList.add("light")
      document.documentElement.classList.remove("dark")
      document.documentElement.style.colorScheme = "light"
    }
  }, [theme, setTheme])

  return (
    <style jsx global>{`
      /* Custom fixes to ensure light theme is properly applied */
      html.light body {
        background-color: white !important;
        color: black !important;
      }
      
      html.light .bg-card {
        background-color: white !important;
      }
      
      html.light .text-foreground {
        color: black !important;
      }
      
      html.light .text-muted-foreground {
        color: hsl(0, 0%, 45%) !important;
      }
      
      html.light .border-border {
        border-color: hsl(0, 0%, 90%) !important;
      }
      
      html.light .bg-background {
        background-color: white !important;
      }
      
      /* Fix for post cards */
      html.light .hover\:bg-accent\/30:hover {
        background-color: rgba(246, 246, 246, 0.3) !important;
      }
      
      /* Fix for buttons in post cards */
      html.light .hover\:text-red-500:hover {
        color: #ef4444 !important;
      }
      
      html.light .hover\:text-primary:hover {
        color: black !important;
      }
      
      html.light .hover\:text-green-500:hover {
        color: #22c55e !important;
      }
      
      html.dark body {
        background-color: black !important;
        color: white !important;
      }
      
      /* Fix for posts in light mode */
      html.light [data-theme="light"] .post-card {
        background-color: white !important;
        color: black !important;
        border: 1px solid hsl(0, 0%, 90%) !important;
      }
    `}</style>
  )
}