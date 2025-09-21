import NextAuth from 'next-auth'
import { JWT } from 'next-auth/jwt'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      username: string
      dateOfBirth?: Date | null
      gender?: string | null
      phoneNumber?: string | null
      profileComplete: boolean
    }
  }

  interface User {
    id: string
    name?: string | null
    email?: string | null
    image?: string | null
    username?: string
    dateOfBirth?: Date | null
    gender?: string | null
    phoneNumber?: string | null
    profileComplete?: boolean
    emailVerified?: boolean
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    username?: string
    dateOfBirth?: Date | null
    gender?: string | null
    phoneNumber?: string | null
    profileComplete?: boolean
  }
}