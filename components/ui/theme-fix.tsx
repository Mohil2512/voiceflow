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
      
      html.dark body {
        background-color: black !important;
        color: white !important;
      }
    `}</style>
  )
}