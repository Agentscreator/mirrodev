// app/api/stream/channel/route.ts
import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/src/lib/auth"
import { StreamChat } from "stream-chat"

// Create server client instance with error handling
let serverClient: StreamChat | null = null

const getServerClient = () => {
  if (!serverClient) {
    const apiKey = process.env.STREAM_API_KEY  // ✅ Fixed: Use non-public env var
    const secret = process.env.STREAM_SECRET_KEY

    if (!apiKey || !secret) {
      throw new Error("Stream API key or secret not configured")
    }

    serverClient = StreamChat.getInstance(apiKey, secret)
  }
  return serverClient
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { recipientId } = body

    if (!recipientId || typeof recipientId !== "string") {
      return NextResponse.json(
        { error: "Valid recipient ID is required" },
        { status: 400 }
      )
    }

    if (recipientId === session.user.id) {
      return NextResponse.json(
        { error: "Cannot create channel with yourself" },
        { status: 400 }
      )
    }

    const currentUserId = session.user.id
    const client = getServerClient()

    // ✅ Fixed: Use consistent channel ID format
    const members = [currentUserId, recipientId].sort()
    const channelId = `dm_${members.join("_")}`  // Server uses dm_userA_userB

    try {
      const existingChannel = client.channel("messaging", channelId)
      await existingChannel.query()

      return NextResponse.json({
        channelId,
        success: true,
        existed: true,
      })
    } catch (channelError) {
      try {
        const newChannel = client.channel("messaging", channelId, {
          members: members,
          created_by_id: currentUserId,
        })

        await newChannel.create()

        return NextResponse.json({
          channelId,
          success: true,
          existed: false,
        })
      } catch (createError) {
        console.error("Channel creation failed:", createError)
        throw createError
      }
    }
  } catch (error) {
    console.error("Stream channel API error:", error)

    let errorMessage = "Failed to create channel"
    let statusCode = 500

    if (error instanceof Error) {
      if (error.message.includes("API key")) {
        errorMessage = "Chat service configuration error"
      } else if (error.message.includes("Unauthorized")) {
        errorMessage = "Authentication failed"
        statusCode = 401
      } else if (error.message.includes("not found")) {
        errorMessage = "User not found"
        statusCode = 404
      }
    }

    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}
