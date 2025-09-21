import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import GitHubProvider from 'next-auth/providers/github'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { ObjectId } from 'mongodb'

// Conditional import of database functions
const getUserCollection = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error('Database not available')
  }
  const { getUserCollection: getCollection } = await import('@/lib/database/mongodb')
  return getCollection()
}

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID || '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          const User = await getUserCollection()
          const user = await User.findOne({ email: credentials.email })

          if (!user || !user.password) {
            return null
          }

          const isPasswordValid = await bcrypt.compare(credentials.password, user.password)
          if (!isPasswordValid) {
            return null
          }

          // Update last login
          await User.updateOne(
            { _id: user._id },
            { 
              $set: { 
                lastLogin: new Date(),
                updatedAt: new Date()
              }
            }
          )

          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            username: user.username,
            dateOfBirth: user.dateOfBirth,
            gender: user.gender,
            phoneNumber: user.phoneNumber,
            profileComplete: user.profileComplete || false,
          }
        } catch (error) {
          console.error('Auth error:', error)
          return null
        }
      }
    })
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log('SignIn callback:', { user, account, provider: account?.provider })
      
      // Skip database operations during build time
      if (!process.env.MONGODB_URI) {
        console.log('Skipping database operations - MongoDB URI not available')
        // Set default user properties for temporary auth
        user.id = user.id || 'temp-' + Date.now()
        user.profileComplete = false
        user.username = user.email?.split('@')[0] || 'user'
        user.dateOfBirth = null
        user.gender = null
        user.phoneNumber = null
        return true
      }
      
      if (account?.provider === 'google' || account?.provider === 'github') {
        try {
          const User = await getUserCollection()
          
          // Check if user already exists
          let existingUser = await User.findOne({ 
            email: user.email 
          })

          if (!existingUser) {
            console.log('Creating new OAuth user:', user.email)
            // Create new user with OAuth data
            const newUser = {
              name: user.name || profile?.name || '',
              email: user.email || '',
              username: '', // Will be set during profile completion
              provider: account.provider,
              providerId: account.providerAccountId,
              dateOfBirth: null,
              gender: null,
              phoneNumber: null,
              emailVerified: true,
              isActive: true,
              profileComplete: false, // OAuth users need to complete profile
              lastLogin: new Date(),
              createdAt: new Date(),
              updatedAt: new Date()
            }

            const result = await User.insertOne(newUser)
            console.log('User created with ID:', result.insertedId)
            user.id = result.insertedId.toString()
            user.profileComplete = false
          } else {
            console.log('Existing user found:', existingUser._id)
            // Update existing user
            await User.updateOne(
              { _id: existingUser._id },
              { 
                $set: { 
                  lastLogin: new Date(),
                  updatedAt: new Date()
                }
              }
            )
            user.id = existingUser._id.toString()
            user.profileComplete = existingUser.profileComplete || false
            user.username = existingUser.username
            user.dateOfBirth = existingUser.dateOfBirth
            user.gender = existingUser.gender
            user.phoneNumber = existingUser.phoneNumber
          }
        } catch (error) {
          console.error('OAuth sign in error:', error)
          // Instead of returning false, allow sign-in with temporary user data
          console.log('Database issue during sign-in, creating temporary session')
          user.id = user.id || 'temp-' + Date.now()
          user.profileComplete = false
          user.username = user.email?.split('@')[0] || 'user'
          user.dateOfBirth = null
          user.gender = null
          user.phoneNumber = null
        }
      }
      return true
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id
        token.username = user.username || user.email?.split('@')[0] || 'user'
        token.dateOfBirth = user.dateOfBirth
        token.gender = user.gender
        token.phoneNumber = user.phoneNumber
        token.profileComplete = user.profileComplete || false
      }

      // Only refresh user data on explicit session update, not on every request
      if (trigger === 'update' && session) {
        console.log('Explicit session update requested')
        // Merge session data into token
        token = { ...token, ...session.user }
      }

      // Skip database operations during build time
      if (!process.env.MONGODB_URI && process.env.NODE_ENV === 'production') {
        return token
      }

      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.username = token.username as string
        session.user.dateOfBirth = token.dateOfBirth as Date
        session.user.gender = token.gender as string
        session.user.phoneNumber = token.phoneNumber as string
        session.user.profileComplete = token.profileComplete as boolean
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      // Allow relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`
      // Allow callback URLs on the same origin
      if (new URL(url).origin === baseUrl) return url
      
      // Default redirect for authenticated users
      return `${baseUrl}/`
    }
  },
  pages: {
    signIn: '/auth/signin',
    newUser: '/auth/complete-profile'
  },
  session: {
    strategy: 'jwt',
  },
})

export { handler as GET, handler as POST }