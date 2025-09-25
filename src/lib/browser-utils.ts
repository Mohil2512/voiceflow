/**
 * Helper function to safely check if code is running in a browser environment
 * This prevents errors during server-side rendering for browser-only APIs
 */
export const isBrowser = () => {
  return typeof window !== 'undefined'
}

/**
 * Safely access localStorage with fallbacks for server-side rendering
 */
export const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (isBrowser()) {
      return localStorage.getItem(key)
    }
    return null
  },
  setItem: (key: string, value: string): void => {
    if (isBrowser()) {
      localStorage.setItem(key, value)
    }
  },
  removeItem: (key: string): void => {
    if (isBrowser()) {
      localStorage.removeItem(key)
    }
  }
}

/**
 * Safely access window object with type checking
 */
export const safeWindow = typeof window !== 'undefined' ? window : null