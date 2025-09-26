import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"

// Force dynamic rendering for this route
export const dynamic = "force-dynamic"

// Import database functions
const getDatabases = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error("MongoDB URI environment variable is not set")
  }
  try {
    const { getDatabases: getDB } = await import("@/lib/database/mongodb")
    return await getDB()
  } catch (error) {
    console.error("Database connection error:", error)
    throw new Error(
      "Failed to connect to MongoDB Atlas: " +
        (error instanceof Error ? error.message : "Unknown error")
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession()
    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Process form data
    const formData = await request.formData()
    const name = formData.get("name") as string
    const username = formData.get("username") as string
    const bio = formData.get("bio") as string
    const avatarFile = formData.get("avatar") as File | null

    // Validate required fields
    if (!name || !username) {
      return NextResponse.json(
        { error: "Name and username are required" },
        { status: 400 }
      )
    }

    // Create update object
    const userUpdate: any = {
      name,
      username,
      bio: bio || "",
    }

    // If avatar was uploaded, process it
    if (avatarFile && avatarFile instanceof File) {
      try {
        const arrayBuffer = await avatarFile.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        userUpdate.image = `data:${avatarFile.type};base64,${buffer.toString("base64")}`
      } catch (error) {
        console.error("Error processing avatar file:", error)
        return NextResponse.json(
          { error: "Failed to process image" },
          { status: 400 }
        )
      }
    }

    // Update user in database
    const databases = await getDatabases()
    
    // Get the current user
    const currentUser = await databases.auth.collection("users").findOne(
      { email: session.user.email }
    )
    
    // Check if the username is being changed
    const isUsernameChanged = currentUser && currentUser.username !== username
    
    // Update user in database
    const result = await databases.auth.collection("users").updateOne(
      { email: session.user.email },
      { $set: userUpdate }
    )

    if (result.matchedCount === 0) {
      // User doesn't exist, create new user record
      await databases.auth.collection("users").insertOne({
        email: session.user.email,
        ...userUpdate,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    } 
    // If username was changed, update references in posts and comments
    else if (isUsernameChanged && currentUser) {
      // Get user ID for reference
      const userId = currentUser._id.toString()
      
      // Update username in posts
      await databases.activities.collection("posts").updateMany(
        { userId: userId },
        { $set: { username: username } }
      )
      
      // Update username in comments
      await databases.activities.collection("comments").updateMany(
        { userId: userId },
        { $set: { username: username } }
      )
      
      // Log the username change
      console.log(`Username changed for user ${userId} from ${currentUser.username} to ${username}`)
    }

    return NextResponse.json({ 
      message: "Profile updated successfully",
      user: {
        name,
        username,
        bio,
        email: session.user.email,
        image: avatarFile ? true : session.user.image, // Just indicate if image was updated
      }
    })
  } catch (error) {
    console.error("Error updating profile:", error)
    return NextResponse.json(
      {
        error: "Failed to update profile",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}