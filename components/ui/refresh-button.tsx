"use client"

import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { useState } from "react"
import { clearAllCache } from "@/hooks/use-data-cache"

interface RefreshButtonProps {
  onRefresh?: () => void
  label?: string
}

export function RefreshButton({ onRefresh, label = "Refresh" }: RefreshButtonProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  const handleRefresh = async () => {
    setIsRefreshing(true)
    
    try {
      // Clear all app cache
      clearAllCache()
      
      // Trigger any custom refresh logic
      if (onRefresh) {
        await onRefresh()
      } else {
        // Default refresh behavior is to reload the page
        window.location.reload()
      }
    } catch (error) {
      console.error('Error refreshing data:', error)
    } finally {
      setIsRefreshing(false)
    }
  }
  
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleRefresh}
      disabled={isRefreshing}
      className="gap-1"
    >
      <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
      {label}
    </Button>
  )
}