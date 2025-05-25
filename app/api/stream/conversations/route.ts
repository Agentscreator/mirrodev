// app/api/stream/conversations/route.ts
import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/src/lib/auth"
import { StreamChat } from "stream-chat"

// Create server client instance with error handling
let serverClient: StreamChat | null = null

const getServerClient = () => {
  if (!serverClient) {
    const apiKey = process.env.STREAM_API_KEY
    const secret = process.env.STREAM_SECRET_KEY

    if (!apiKey || !secret) {
      throw new Error("Stream API key or secret not configured")
    }

    serverClient = StreamChat.getInstance(apiKey, secret)
  }
  return serverClient
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const client = getServerClient()
    const userId = session.user.id

    // Query channels where the current user is a member
    const filter = {
      type: "messaging",
      members: { $in: [userId] }
    }

    const sort = [{ last_message_at: -1 as const }]
    const options = {
      state: true,
      watch: false,
      presence: false,
      limit: 50
    }

    const channels = await client.queryChannels(filter, sort, options)

    // Transform channels into conversation format
    const conversations = channels.map(channel => {
      // Get the other user in the conversation (assuming 1-on-1 chats)
      const otherUserId = Object.keys(channel.state.members).find(id => id !== userId)
      const otherUser = otherUserId ? channel.state.members[otherUserId]?.user : null

      // Get the last message
      const lastMessage = channel.state.messages.length > 0 
        ? channel.state.messages[channel.state.messages.length - 1]
        : null

      // Check if there are unread messages
      const unread = (channel.state.unreadCount || 0) > 0

      return {
        id: channel.id || channel.cid,
        user: {
          id: otherUserId || "unknown",
          username: otherUser?.name || otherUser?.id || "Unknown User",
          nickname: otherUser?.name,
          image: otherUser?.image
        },
        lastMessage: lastMessage?.text || undefined,
        timestamp: lastMessage?.created_at || channel.state.last_message_at,
        unread
      }
    })

    // Filter out conversations where we couldn't find the other user
    const validConversations = conversations.filter(conv => conv.user.id !== "unknown")

    return NextResponse.json({
      conversations: validConversations,
      total: validConversations.length
    })

  } catch (error) {
    console.error("Stream conversations API error:", error)

    let errorMessage = "Failed to fetch conversations"
    let statusCode = 500

    if (error instanceof Error) {
      if (error.message.includes("API key")) {
        errorMessage = "Chat service configuration error"
      } else if (error.message.includes("Unauthorized")) {
        errorMessage = "Authentication failed"
        statusCode = 401
      }
    }

    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}