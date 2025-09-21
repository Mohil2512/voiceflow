import { withAuth } from "next-auth/middleware"

export default withAuth(
  function middleware(req) {
    // This middleware runs when the user is authenticated
    // You can add additional logic here if needed
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl
        
        // Allow access to auth pages
        if (pathname.startsWith('/auth/')) {
          return true
        }
        
        // Allow access to API routes (except protected ones)
        if (pathname.startsWith('/api/') && !pathname.startsWith('/api/protected/')) {
          return true
        }
        
        // Allow access to public pages
        const publicPages = ['/', '/about', '/privacy', '/terms']
        if (publicPages.includes(pathname)) {
          return true
        }
        
        // For all other pages, require authentication
        if (!token) {
          return false
        }
        
        // If user is authenticated but profile is incomplete,
        // allow access to main app pages but redirect from settings/admin pages
        if (!token.profileComplete && pathname !== '/auth/complete-profile' && pathname !== '/dashboard' && pathname !== '/profile' && pathname !== '/activity' && pathname !== '/create' && pathname !== '/search') {
          return false
        }
        
        return true
      },
    },
  }
)

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.).*)',
  ],
}