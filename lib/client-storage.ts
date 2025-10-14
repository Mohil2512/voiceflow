'use client';

// Safe client-side storage utility with fallbacks for SSR

export const clientStorage = {
  getItem<T = unknown>(key: string, fallback: T | null = null): T | null {
    if (typeof window === 'undefined') {
      return fallback;
    }
    
    try {
      const item = localStorage.getItem(key);
      return item !== null ? (JSON.parse(item) as T) : fallback;
    } catch (error) {
      console.error(`Error getting item ${key} from localStorage:`, error);
      return fallback;
    }
  },
  
  setItem<T>(key: string, value: T): void {
    if (typeof window === 'undefined') {
      return;
    }
    
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error setting item ${key} in localStorage:`, error);
    }
  },
  
  removeItem(key: string): void {
    if (typeof window === 'undefined') {
      return;
    }
    
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing item ${key} from localStorage:`, error);
    }
  }
};