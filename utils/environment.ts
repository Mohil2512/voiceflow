/**
 * This module provides utility functions for Next.js environment detection
 * to safely handle server-side rendering vs client-side execution
 */

/**
 * Check if code is running on the server during build/SSR
 */
export const isServer = () => typeof window === 'undefined';

/**
 * Check if code is running in the browser
 */
export const isBrowser = () => !isServer();

/**
 * Safe localStorage implementation that works in both SSR and CSR environments
 */
export const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (isBrowser()) {
      return localStorage.getItem(key);
    }
    return null;
  },
  
  setItem: (key: string, value: string): void => {
    if (isBrowser()) {
      localStorage.setItem(key, value);
    }
  },
  
  removeItem: (key: string): void => {
    if (isBrowser()) {
      localStorage.removeItem(key);
    }
  }
};

/**
 * Safe window object that prevents server-side rendering errors
 */
export const safeWindow = isBrowser() ? window : undefined;