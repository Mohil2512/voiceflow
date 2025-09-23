"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { clearAllCache, useDetectPageRefresh } from "@/hooks/use-data-cache";

// Define the shape of our data context
interface DataContextType {
  posts: any[] | null;
  setPosts: (posts: any[]) => void;
  users: Record<string, any> | null;
  setUsers: (users: Record<string, any>) => void;
  clearCache: () => void;
  isLoading: boolean;
  wasRefreshed: boolean;
}

// Create the context
const DataContext = createContext<DataContextType | undefined>(undefined);

// Provider component
export function DataProvider({ children }: { children: ReactNode }) {
  const [posts, setPosts] = useState<any[] | null>(null);
  const [users, setUsers] = useState<Record<string, any> | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const wasRefreshed = useDetectPageRefresh();
  
  // Initialize data from localStorage if available
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    try {
      // Try to get cached posts
      const cachedPosts = localStorage.getItem('voiceflow-posts');
      if (cachedPosts) {
        const parsedCache = JSON.parse(cachedPosts);
        if (parsedCache.timestamp && Date.now() - parsedCache.timestamp <= 10 * 60 * 1000) {
          setPosts(parsedCache.data);
        } else {
          // Expired cache
          localStorage.removeItem('voiceflow-posts');
        }
      }
      
      // Try to get cached users
      const cachedUsers = localStorage.getItem('voiceflow-users');
      if (cachedUsers) {
        const parsedCache = JSON.parse(cachedUsers);
        if (parsedCache.timestamp && Date.now() - parsedCache.timestamp <= 10 * 60 * 1000) {
          setUsers(parsedCache.data);
        } else {
          // Expired cache
          localStorage.removeItem('voiceflow-users');
        }
      }
    } catch (error) {
      console.error("Error initializing data from cache:", error);
    }
  }, []);
  
  // Function to store posts with timestamp
  const storePostsWithTimestamp = (newPosts: any[]) => {
    setPosts(newPosts);
    
    if (typeof window === 'undefined') return;
    
    try {
      const cacheItem = {
        data: newPosts,
        timestamp: Date.now(),
      };
      localStorage.setItem('voiceflow-posts', JSON.stringify(cacheItem));
    } catch (error) {
      console.error("Error storing posts in cache:", error);
    }
  };
  
  // Function to store users with timestamp
  const storeUsersWithTimestamp = (newUsers: Record<string, any>) => {
    setUsers(newUsers);
    
    if (typeof window === 'undefined') return;
    
    try {
      const cacheItem = {
        data: newUsers,
        timestamp: Date.now(),
      };
      localStorage.setItem('voiceflow-users', JSON.stringify(cacheItem));
    } catch (error) {
      console.error("Error storing users in cache:", error);
    }
  };
  
  // Function to clear all cache
  const clearCache = () => {
    clearAllCache();
    setPosts(null);
    setUsers(null);
  };
  
  return (
    <DataContext.Provider
      value={{
        posts,
        setPosts: storePostsWithTimestamp,
        users,
        setUsers: storeUsersWithTimestamp,
        clearCache,
        isLoading,
        wasRefreshed,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

// Custom hook to use the data context
export function useAppData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error("useAppData must be used within a DataProvider");
  }
  return context;
}