/**
 * This file contains the configuration for NextAuth.js
 * It's important to have these settings in a separate file to avoid
 * issues with server-side rendering and client-side code
 */

import type { NextAuthOptions } from "next-auth";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise from '@/lib/database/mongodb';
import GoogleProvider from "next-auth/providers/google";
import GithubProvider from "next-auth/providers/github";

// Safe creation of MongoDB adapter that works in both development and production
const getMongoDBAdapter = () => {
  // Only use adapter when we have a valid MongoDB URI
  if (process.env.MONGODB_URI) {
    try {
      return MongoDBAdapter(clientPromise);
    } catch (error) {
      console.warn("Failed to create MongoDB adapter:", error);
    }
  }
  return undefined;
};

export const authOptions: NextAuthOptions = {
  // Configure adapters and providers here instead of directly in route.ts
  // This helps avoid server-side rendering issues
  adapter: getMongoDBAdapter(),
  
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
    // Add other providers as needed
  ],
  
  session: {
    strategy: "jwt",
  },
  
  pages: {
    signIn: "/auth/signin",
    signOut: "/auth/signout",
    error: "/auth/error",
  },
  
  callbacks: {
    async signIn({ user, account, profile }) {
      // Allow all sign ins
      return true;
    },

    async redirect({ url, baseUrl }) {
      // If user is signing in, check if they need to complete their profile
      if (url === baseUrl || url === `${baseUrl}/`) {
        // This will be handled by the complete-profile page itself
        return `${baseUrl}/auth/complete-profile`;
      }
      
      // Allow relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      
      // Allow callback URLs on the same origin
      if (new URL(url).origin === baseUrl) return url;
      
      return baseUrl;
    },

    async session({ session, token }) {
      if (token && session.user && token.sub) {
        session.user.id = token.sub;
        
        // Add image to session if available in token
        if (token.picture) {
          session.user.image = token.picture as string;
        }
        
        // Add username if available
        if (token.username) {
          session.user.username = token.username as string;
        }
        
        // Add other fields from database if available
        if (token.phoneNumber) {
          session.user.phoneNumber = token.phoneNumber as string;
        }
        
        if (token.bio) {
          session.user.bio = token.bio as string;
        }
      }
      return session;
    },
    
    async jwt({ token, user, account, profile }) {
      // When user signs in for the first time
      if (user) {
        // Copy user image to token if available
        if (user.image) {
          token.picture = user.image;
        }
        
        // Copy username if available
        if (user.username) {
          token.username = user.username;
        }
        
        // Copy phone number if available
        if (user.phoneNumber) {
          token.phoneNumber = user.phoneNumber;
        }
        
        // Copy bio if available
        if (user.bio) {
          token.bio = user.bio;
        }
      }
      
      return token;
    }
  },
};

export default authOptions;