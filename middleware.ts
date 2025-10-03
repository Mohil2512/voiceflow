import { NextResponse } from 'next/server';

// Simple middleware - no redirects needed
export function middleware(request) {
  // Just let all requests pass through normally
  return NextResponse.next();
}

// Remove the problematic matcher
export const config = {
  matcher: [],
};
