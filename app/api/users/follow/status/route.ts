import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  return NextResponse.json(
    { error: 'Database functionality has been removed' },
    { status: 503 }
  )
}

export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: 'Database functionality has been removed' },
    { status: 503 }
  )
}

export async function PUT(request: NextRequest) {
  return NextResponse.json(
    { error: 'Database functionality has been removed' },
    { status: 503 }
  )
}

export async function DELETE(request: NextRequest) {
  return NextResponse.json(
    { error: 'Database functionality has been removed' },
    { status: 503 }
  )
}