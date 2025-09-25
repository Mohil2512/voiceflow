/**
 * This file contains the configuration for NextAuth.js
 * It's important to have these settings in a separate file to avoid
 * issues with server-side rendering and client-side code
 */

import type { NextAuthOptions } from "next-auth";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise from '@/lib/mongodb-safe';
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
    async session({ session, token }) {
      if (token && session.user && token.sub) {
        session.user.id = token.sub;
        // You can add other user properties here
      }
      return session;
    },
  },
};

export default authOptions;