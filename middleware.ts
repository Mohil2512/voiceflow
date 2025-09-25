import { NextResponse } from 'next/server';

// Simple redirect middleware for notification pages
export function middleware(request) {
  const { pathname } = request.nextUrl;
  
  // Handle case-sensitive notification path redirection
  if (pathname.toLowerCase() === '/notification' && pathname !== '/notification') {
    return NextResponse.redirect(new URL('/notification', request.url));
  }
  
  return NextResponse.next();
}

// Define matcher patterns
export const config = {
  matcher: ['/Notification', '/NOTIFICATION', '/notification'],
};
