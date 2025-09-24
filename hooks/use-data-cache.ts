"use client";

import { useState, useEffect } from "react";

// Cache expiration time (10 minutes)
const CACHE_EXPIRY = 10 * 60 * 1000;

interface CacheItem<T> {
  data: T;
  timestamp: number;
}

/**
 * Custom hook for fetching data with client-side caching
 * @param key A unique key for this data
 * @param fetchFunction The function to fetch data if it's not in cache
 * @param options Configuration options
 * @returns The fetched or cached data, loading state, and error
 */
export function useDataWithCache<T>(
  key: string,
  fetchFunction: () => Promise<T>,
  options: {
    enabled?: boolean;
    forceRefresh?: boolean;
    cacheTime?: number;
  } = {}
) {
  const { enabled = true, forceRefresh = false, cacheTime = CACHE_EXPIRY } = options;
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  // Function to check if localStorage is available (not in SSR)
  const isLocalStorageAvailable = () => {
    if (typeof window === 'undefined') return false;
    try {
      window.localStorage.setItem('test', 'test');
      window.localStorage.removeItem('test');
      return true;
    } catch (e) {
      return false;
    }
  };

  // Get data from cache
  const getFromCache = (): T | null => {
    if (!isLocalStorageAvailable()) return null;
    
    try {
      const cachedItem = localStorage.getItem(`voiceflow-${key}`);
      if (!cachedItem) return null;
      
      const parsedItem: CacheItem<T> = JSON.parse(cachedItem);
      const now = Date.now();
      
      // Check if cache is still valid
      if (now - parsedItem.timestamp <= cacheTime) {
        return parsedItem.data;
      }
      
      // Cache expired
      localStorage.removeItem(`voiceflow-${key}`);
      return null;
    } catch (e) {
      console.error("Error reading from cache:", e);
      return null;
    }
  };

  // Save data to cache
  const saveToCache = (data: T): void => {
    if (!isLocalStorageAvailable()) return;
    
    try {
      const cacheItem: CacheItem<T> = {
        data,
        timestamp: Date.now(),
      };
      localStorage.setItem(`voiceflow-${key}`, JSON.stringify(cacheItem));
    } catch (e) {
      console.error("Error saving to cache:", e);
    }
  };

  // Clear cache for this key
  const clearCache = () => {
    if (isLocalStorageAvailable()) {
      localStorage.removeItem(`voiceflow-${key}`);
    }
  };

  // Fetch data with cache support
  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Try to get from cache first if not forcing refresh
      if (!forceRefresh) {
        const cachedData = getFromCache();
        if (cachedData) {
          console.log(`Using cached data for ${key}`);
          setData(cachedData);
          setIsLoading(false);
          return;
        }
      }
      
      // Cache not available or expired, fetch fresh data
      console.log(`Fetching fresh data for ${key}`);
      const freshData = await fetchFunction();
      setData(freshData);
      saveToCache(freshData);
    } catch (err) {
      console.error(`Error fetching data for ${key}:`, err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  };

  // Add a retry mechanism
  const retryFetch = async (retries = 2, delay = 1000) => {
    try {
      await fetchData();
    } catch (err) {
      if (retries > 0) {
        console.log(`Retrying fetch for ${key}, ${retries} retries left`);
        setTimeout(() => retryFetch(retries - 1, delay * 1.5), delay);
      }
    }
  };

  useEffect(() => {
    if (enabled) {
      // Try to get from cache immediately to prevent unnecessary loading state
      const cachedData = getFromCache();
      if (cachedData && !forceRefresh) {
        console.log(`Using cached data for ${key} (immediate)`);
        setData(cachedData);
        // Still fetch in background if needed, but without showing loading state
        if (navigator.onLine) {
          setTimeout(() => {
            fetchFunction().then(freshData => {
              saveToCache(freshData);
              setData(freshData);
            }).catch(err => {
              console.error(`Background refresh error for ${key}:`, err);
            });
          }, 2000);
        }
      } else {
        retryFetch();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled, forceRefresh]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
    clearCache,
  };
}

/**
 * Hook for tracking if the user has manually refreshed the page
 * @returns Boolean indicating if the page was refreshed
 */
export function useDetectPageRefresh() {
  const [wasRefreshed, setWasRefreshed] = useState(false);

  useEffect(() => {
    // Check if this is a page refresh or navigation
    const pageLoadType = sessionStorage.getItem('voiceflow-page-load-type');
    
    if (!pageLoadType || pageLoadType !== 'navigation') {
      // This is a fresh load or refresh
      setWasRefreshed(true);
      sessionStorage.setItem('voiceflow-page-load-type', 'refresh');
    } else {
      setWasRefreshed(false);
    }

    // Listen for navigation events
    const handleBeforeUnload = () => {
      sessionStorage.setItem('voiceflow-page-load-type', 'navigation');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  return wasRefreshed;
}

/**
 * Function to clear all cache
 */
export function clearAllCache() {
  if (typeof window === 'undefined') return;
  
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('voiceflow-')) {
        localStorage.removeItem(key);
      }
    });
  } catch (e) {
    console.error("Error clearing all cache:", e);
  }
}