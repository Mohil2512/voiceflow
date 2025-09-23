"use client";

import Cookies from 'js-cookie';

const CACHE_EXPIRY_TIME = 10 * 60 * 1000; // 10 minutes in milliseconds

/**
 * Cache utility to store and retrieve data from localStorage and cookies
 * Cookies store metadata about cache entries while localStorage stores the actual data
 */
export const cacheUtils = {
  /**
   * Set data in the cache
   * @param key Cache key
   * @param data Data to store
   * @param expiryTime Optional custom expiry time in milliseconds
   */
  setCache: (key: string, data: any, expiryTime = CACHE_EXPIRY_TIME) => {
    if (typeof window === 'undefined') return;
    
    try {
      // Store the data in localStorage
      localStorage.setItem(`voiceflow-cache-${key}`, JSON.stringify(data));
      
      // Store the timestamp in a cookie
      const expiryDate = new Date(Date.now() + expiryTime);
      Cookies.set(`voiceflow-cache-ts-${key}`, Date.now().toString(), { expires: expiryDate, sameSite: 'strict' });
      console.log(`Cached data for ${key}`);
    } catch (error) {
      console.error('Error caching data:', error);
    }
  },

  /**
   * Get data from cache if it exists and is not expired
   * @param key Cache key
   * @returns The cached data or null if not found or expired
   */
  getCache: <T = any>(key: string): T | null => {
    if (typeof window === 'undefined') return null;
    
    try {
      // Check if the timestamp cookie exists
      const timestamp = Cookies.get(`voiceflow-cache-ts-${key}`);
      if (!timestamp) return null;
      
      // Check if the cache is expired
      const timestampNum = parseInt(timestamp);
      if (isNaN(timestampNum) || Date.now() - timestampNum > CACHE_EXPIRY_TIME) {
        // Cache expired, clear it
        cacheUtils.clearCache(key);
        return null;
      }
      
      // Get the data from localStorage
      const cachedData = localStorage.getItem(`voiceflow-cache-${key}`);
      if (!cachedData) return null;
      
      return JSON.parse(cachedData) as T;
    } catch (error) {
      console.error('Error retrieving cached data:', error);
      return null;
    }
  },

  /**
   * Clear specific cache entry
   * @param key Cache key
   */
  clearCache: (key: string) => {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.removeItem(`voiceflow-cache-${key}`);
      Cookies.remove(`voiceflow-cache-ts-${key}`);
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  },

  /**
   * Clear all cache entries
   */
  clearAllCache: () => {
    if (typeof window === 'undefined') return;
    
    try {
      // Get all cookies
      const cookies = Cookies.get();
      
      // Find all voiceflow cache timestamp cookies
      Object.keys(cookies).forEach(cookieName => {
        if (cookieName.startsWith('voiceflow-cache-ts-')) {
          const key = cookieName.replace('voiceflow-cache-ts-', '');
          cacheUtils.clearCache(key);
        }
      });
    } catch (error) {
      console.error('Error clearing all cache:', error);
    }
  }
};