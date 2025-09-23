"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider, useTheme as useNextTheme } from "next-themes"
import { useEffect } from "react"

interface ThemeProviderProps {
  children: React.ReactNode
  defaultTheme?: string
  storageKey?: string
}

export function ThemeProvider({ 
  children, 
  defaultTheme = "dark",
  storageKey = "theme"
}: ThemeProviderProps) {
  const [mounted, setMounted] = React.useState(false)
  
  // Ensure proper theme application after hydration
  useEffect(() => {
    // Manually add class to document on mount to ensure theme is applied
    setMounted(true)
    
    // Get the stored theme preference or use default
    const storedTheme = localStorage.getItem(storageKey) || defaultTheme
    
    // Force apply the theme class to avoid flicker - fix the reversed theme
    if (storedTheme === "dark") {
      document.documentElement.classList.add("dark")
      document.documentElement.classList.remove("light")
      document.documentElement.style.colorScheme = "dark"
    } else {
      document.documentElement.classList.remove("dark")
      document.documentElement.classList.add("light")
      document.documentElement.style.colorScheme = "light"
    }
  }, [defaultTheme, storageKey])
  
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme={defaultTheme}
      storageKey={storageKey}
      enableSystem={false}
      disableTransitionOnChange
      enableColorScheme={true}
      forcedTheme={mounted ? undefined : "dark"}
    >
      {children}
    </NextThemesProvider>
  )
}

export function useTheme() {
  return useNextTheme()
}