import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import GitHubProvider from 'next-auth/providers/github'

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
      clientId: process.env.GITHUB_ID || process.env.GITHUB_CLIENT_ID || '',
      clientSecret: process.env.GITHUB_SECRET || process.env.GITHUB_CLIENT_SECRET || '',
    })
  ],
  callbacks: {
    async signIn({ user, account }) {
      console.log('SignIn callback:', { user, account, provider: account?.provider })
      
      // Database removed - create temporary session data
      user.id = user.id || 'temp-' + Date.now()
      // Only assign properties that exist in the User type
      if ('profileComplete' in user) {
        user.profileComplete = false
      }
      if ('username' in user) {
        user.username = user.email?.split('@')[0] || 'user'
      }
      
      return true
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id
        token.username = user.username || user.email?.split('@')[0] || 'user'
        if ('phoneNumber' in user) {
          token.phoneNumber = user.phoneNumber
        }
        if ('profileComplete' in user) {
          token.profileComplete = user.profileComplete || false
        }
      }

      // Handle session updates
      if (trigger === 'update' && session) {
        console.log('Explicit session update requested')
        token = { ...token, ...session.user }
      }

      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.username = token.username as string
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