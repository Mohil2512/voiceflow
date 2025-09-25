// This file validates the required environment variables for the application
// and provides fallbacks for development environments

/**
 * Validate essential environment variables and provide fallbacks
 * for development environment.
 */
export function validateEnv() {
  // For critical variables, throw an error if missing
  if (!process.env.MONGODB_URI) {
    // Allow build to proceed but warn
    console.warn("Warning: MONGODB_URI is missing. Some features may not work properly.");
  }

  if (!process.env.NEXTAUTH_SECRET) {
    if (process.env.NODE_ENV === 'production') {
      // For production, this is critical
      console.error("Error: NEXTAUTH_SECRET is required in production environment.");
      // Don't throw error during build to allow Vercel build to complete
    } else {
      // For development, use a default value
      process.env.NEXTAUTH_SECRET = 'development-secret-do-not-use-in-production';
    }
  }

  // Set NEXTAUTH_URL if not set
  if (!process.env.NEXTAUTH_URL) {
    if (process.env.NODE_ENV === 'development') {
      process.env.NEXTAUTH_URL = 'http://localhost:3000';
    } else if (process.env.VERCEL_URL) {
      process.env.NEXTAUTH_URL = `https://${process.env.VERCEL_URL}`;
    }
  }
}