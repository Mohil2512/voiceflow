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
        console.log("Processing avatar file:", avatarFile.name, avatarFile.type, avatarFile.size)
        const arrayBuffer = await avatarFile.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        const base64Image = `data:${avatarFile.type};base64,${buffer.toString("base64")}`
        userUpdate.image = base64Image
        console.log("Avatar processed successfully, length:", base64Image.length)
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
    console.log("Updating user in database with:", userUpdate)
    const result = await databases.auth.collection("users").updateOne(
      { email: session.user.email },
      { $set: userUpdate }
    )
    console.log("Database update result:", result)

    if (result.matchedCount === 0) {
      // User doesn't exist, create new user record
      await databases.auth.collection("users").insertOne({
        email: session.user.email,
        ...userUpdate,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    } 
    // If username was changed or avatar was uploaded, update references in posts and comments
    else if ((isUsernameChanged || avatarFile) && currentUser) {
      // Get user ID for reference
      const userId = currentUser._id.toString()
      
      // Create update object for posts and comments
      const updateFields: any = {}
      
      // Update username if changed
      if (isUsernameChanged) {
        updateFields.username = username
        
        // Update author.username in posts for display
        await databases.activities.collection("posts").updateMany(
          { userId: userId },
          { $set: { "author.username": username } }
        )
        
        // Log the username change
        console.log(`Username changed for user ${userId} from ${currentUser.username} to ${username}`)
      }
      
      // Update avatar if changed
      if (avatarFile) {
        // Update avatar in posts
        await databases.activities.collection("posts").updateMany(
          { userId: userId },
          { $set: { "author.image": userUpdate.image } }
        )
        
        // Log the avatar change
        console.log(`Avatar updated for user ${userId}`)
      }
      
      // Update posts with the relevant fields
      if (Object.keys(updateFields).length > 0) {
        await databases.activities.collection("posts").updateMany(
          { userId: userId },
          { $set: updateFields }
        )
        
        // Update comments
        await databases.activities.collection("comments").updateMany(
          { userId: userId },
          { $set: updateFields }
        )
      }
    }

    // Prepare response with actual image data if available
    const updatedImageUrl = avatarFile ? userUpdate.image : session.user.image;
    
    return NextResponse.json({ 
      message: "Profile updated successfully",
      user: {
        name,
        username,
        bio,
        email: session.user.email,
        image: updatedImageUrl, // Return the actual image data
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