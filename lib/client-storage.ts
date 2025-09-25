'use client';

// Safe client-side storage utility with fallbacks for SSR

export const clientStorage = {
  getItem(key: string, fallback: any = null): any {
    if (typeof window === 'undefined') {
      return fallback;
    }
    
    try {
      const item = localStorage.getItem(key);
      return item !== null ? JSON.parse(item) : fallback;
    } catch (error) {
      console.error(`Error getting item ${key} from localStorage:`, error);
      return fallback;
    }
  },
  
  setItem(key: string, value: any): void {
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