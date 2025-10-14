import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Simple health check for the auth route
    return NextResponse.json({ 
      status: 'ok', 
      message: 'NextAuth route is accessible',
      env: {
        hasMongoUri: !!process.env.MONGODB_URI,
        hasGoogleClient: !!process.env.GOOGLE_CLIENT_ID,
        hasGithubClient: !!process.env.GITHUB_CLIENT_ID,
        nodeEnv: process.env.NODE_ENV
      }
    })
  } catch (error) {
    console.error('Auth health check failed:', error)
    return NextResponse.json({ 
      status: 'error', 
      message: 'Health check failed'
    }, { status: 500 })
  }
}