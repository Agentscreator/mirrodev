"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { Channel, MessageInput, MessageList, Thread, Window } from "stream-chat-react"
import { StreamChat } from "stream-chat"
import type { Channel as StreamChannel } from "stream-chat"
import "stream-chat-react/dist/css/v2/index.css"

interface User {
  id: string
  username: string
  nickname?: string
  image?: string
  profileImage?: string
}

export default function UserMessagePage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const userId = params.userId as string
  
  const [user, setUser] = useState<User | null>(null)
  const [channel, setChannel] = useState<StreamChannel | null>(null)
  const [streamClient, setStreamClient] = useState<StreamChat | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const initializeChat = async () => {
      if (!session?.user?.id || !userId) {
        return
      }

      try {
        setLoading(true)
        setError(null)

        // 1. Fetch user information
        const userResponse = await fetch(`/api/users/${userId}`)
        if (!userResponse.ok) {
          if (userResponse.status === 404) {
            setError("User not found")
            return
          }
          throw new Error("Failed to fetch user data")
        }

        const userData = await userResponse.json()
        setUser({
          id: userData.user.id,
          username: userData.user.username,
          nickname: userData.user.nickname,
          image: userData.user.image || userData.user.profileImage,
        })

        // 2. Get Stream API key and token
        const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY
        if (!apiKey) {
          throw new Error("Stream API key not found")
        }

        const tokenResponse = await fetch("/api/stream/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        })

        if (!tokenResponse.ok) {
          throw new Error("Failed to get Stream token")
        }

        const { token } = await tokenResponse.json()

        // 3. Initialize Stream client and connect user
        const client = StreamChat.getInstance(apiKey)
        
        const streamUser = {
          id: session.user.id,
          name: session.user.name || session.user.email || session.user.id,
          image: session.user.image || undefined,
        }

        await client.connectUser(streamUser, token)
        setStreamClient(client)

        // 4. Create/get channel via API
        const channelResponse = await fetch("/api/stream/channel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recipientId: userId }),
        })

        if (!channelResponse.ok) {
          const errorData = await channelResponse.json()
          throw new Error(errorData.error || "Failed to create channel")
        }

        const { channelId } = await channelResponse.json()
        console.log("Using channel ID from server:", channelId)

        // 5. Watch the channel
        const streamChannel = client.channel("messaging", channelId)
        await streamChannel.watch()
        console.log("Successfully connected to channel:", channelId)
        
        setChannel(streamChannel)

      } catch (err) {
        console.error("Chat initialization error:", err)
        setError(err instanceof Error ? err.message : "Failed to load conversation")
      } finally {
        setLoading(false)
      }
    }

    initializeChat()

    // Cleanup function
    return () => {
      if (streamClient) {
        streamClient.disconnectUser().catch(console.warn)
      }
    }
  }, [session?.user?.id, userId])

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-5rem)] md:h-[calc(100vh-4rem)] items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading conversation...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-[calc(100vh-5rem)] md:h-[calc(100vh-4rem)] items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-2">{error}</h2>
          <p className="text-gray-600 mb-4">
            {error === "User not found"
              ? "This user doesn't exist or has been removed."
              : "Unable to load this conversation."}
          </p>
          <Button
            className="rounded-full bg-blue-600 hover:bg-blue-700"
            onClick={() => router.push("/messages")}

          >
            Back to Messages
          </Button>
        </div>
      </div>
    )
  }

  if (!channel || !user || !streamClient) {
    return (
      <div className="flex h-[calc(100vh-5rem)] md:h-[calc(100vh-4rem)] items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-blue-600">Loading...</h2>
          <p className="mt-2 text-gray-600">Setting up your conversation...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-5rem)] md:h-[calc(100vh-4rem)] flex-col bg-gradient-to-br from-blue-50 via-white to-blue-50">
      {/* Custom Header */}
      <div className="border-b bg-white/80 backdrop-blur-sm p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full mr-1 hover:bg-blue-100"
            onClick={() => router.push("/messages")}

          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="relative h-10 w-10 overflow-hidden rounded-full border-2 border-blue-200">
            {user.image ? (
              <Image
                src={user.image || "/placeholder.svg"}
                alt={user.username}
                fill
                className="object-cover"
                sizes="40px"
              />
            ) : (
              <div className="w-full h-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                {user.username[0]?.toUpperCase() || "?"}
              </div>
            )}
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-blue-600">{user.nickname || user.username}</h3>
            <p className="text-xs text-gray-500">{user.nickname ? `@${user.username}` : "Online"}</p>
          </div>
        </div>
      </div>

      {/* Stream Chat Integration */}
      <div className="flex-1 flex stream-chat-custom">
        <Channel channel={channel}>
          <Window>
            <div className="str-chat__main-panel" style={{ height: "100%" }}>
              <MessageList />
              <div className="border-t bg-white/80 backdrop-blur-sm p-4">
                <MessageInput />
              </div>
            </div>
          </Window>
          <Thread />
        </Channel>
      </div>

      <style jsx global>{`
        .stream-chat-custom .str-chat__main-panel {
          background: transparent;
        }
        
        .stream-chat-custom .str-chat__message-list {
          background: transparent;
          padding: 1rem;
        }
        
        .stream-chat-custom .str-chat__message-simple {
          margin-bottom: 1rem;
        }
        
        .stream-chat-custom .str-chat__message-simple__content {
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(59, 130, 246, 0.1);
          border-radius: 0.75rem;
          padding: 0.75rem;
        }
        
        .stream-chat-custom .str-chat__message-simple--me .str-chat__message-simple__content {
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          color: white;
        }
        
        .stream-chat-custom .str-chat__input {
          background: transparent;
          border: none;
          padding: 0;
        }
        
        .stream-chat-custom .str-chat__input .rta {
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(59, 130, 246, 0.2);
          border-radius: 1.5rem;
          padding: 0.75rem 1rem;
        }
        
        .stream-chat-custom .str-chat__send-button {
          background: #3b82f6;
          border-radius: 50%;
          width: 2.5rem;
          height: 2.5rem;
          margin-left: 0.5rem;
        }
        
        .stream-chat-custom .str-chat__send-button:hover {
          background: #1d4ed8;
        }
      `}</style>
    </div>
  )
}