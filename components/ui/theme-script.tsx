"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

// This component will add a script to fix theme application issues
export default function ThemeScript() {
  const [mounted, setMounted] = useState(false)
  const { setTheme } = useTheme()
  
  useEffect(() => {
    // Apply theme immediately before setting mounted to true
    try {
      // Convert any system theme to dark on initialization
      if (localStorage.getItem('voiceflow-theme') === 'system') {
        localStorage.setItem('voiceflow-theme', 'dark')
        setTheme('dark')
      }
      
      // Fix theme on page load - fix reversed themes
      const storedTheme = localStorage.getItem('voiceflow-theme')
      
      if (storedTheme === 'light') {
        document.documentElement.classList.add('light')
        document.documentElement.classList.remove('dark')
        document.documentElement.style.colorScheme = 'light'
      } else {
        // Default to dark for any other value including 'dark' and 'system'
        document.documentElement.classList.add('dark')
        document.documentElement.classList.remove('light')
        document.documentElement.style.colorScheme = 'dark'
      }
    } catch (error) {
      console.error("Error applying theme:", error)
    }
    
    // Set mounted to true AFTER applying the theme
    setMounted(true)
    
    // Listen for theme changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === 'attributes' &&
          mutation.attributeName === 'class'
        ) {
          const isDark = document.documentElement.classList.contains('dark')
          document.documentElement.style.backgroundColor = isDark ? '#000' : '#fff'
          document.documentElement.style.color = isDark ? '#fff' : '#000'
        }
      })
    })
    
    observer.observe(document.documentElement, { 
      attributes: true, 
      attributeFilter: ['class'] 
    })
    
    return () => {
      observer.disconnect()
    }
  }, [setTheme])
  
  if (!mounted) return null
  
  return null
}