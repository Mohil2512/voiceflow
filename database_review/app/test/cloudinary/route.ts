import { NextRequest, NextResponse } from 'next/server'
import { testCloudinaryConnection } from '@/lib/cloudinary'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    console.log('Testing Cloudinary connection...')
    const result = await testCloudinaryConnection()
    
    if (result.success) {
      console.log('✅ Cloudinary connection successful!')
      return NextResponse.json({
        success: true,
        message: 'Cloudinary connection successful',
        data: result.data
      })
    } else {
      console.error('❌ Cloudinary connection failed:', result.error)
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 500 })
    }
  } catch (error) {
    console.error('❌ Cloudinary test failed:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}