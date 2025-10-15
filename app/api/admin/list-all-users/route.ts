import { NextResponse } from 'next/server'
import { getDatabases } from '@/lib/database/mongodb'

export const dynamic = 'force-dynamic'

// GET /api/admin/list-all-users - List all users in database
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET() {
  try {
    const { auth } = await getDatabases()
    const usersCollection = auth.collection('user')

    // Get all users
    const allUsers = await usersCollection.find({}).toArray()

    return NextResponse.json({
      total: allUsers.length,
      users: allUsers.map(user => ({
        id: user._id.toString(),
        name: user.name,
        username: user.username,
        email: user.email,
        hasUsername: !!user.username,
        createdAt: user.createdAt
      }))
    })
  } catch (error) {
    console.error('Error listing users:', error)
    return NextResponse.json(
      { error: 'Failed to list users' },
      { status: 500 }
    )
  }
}
