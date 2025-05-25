// app/(authenticated)/messages/page.tsx
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { MessageCircle, Search } from "lucide-react"
import { Input } from "@/components/ui/input"

interface Conversation {
  id: string
  otherUser: {
    id: string
    username: string
    nickname?: string
    image?: string
  }
  lastMessage?: {
    text: string
    timestamp: string
    senderId: string
  }
  unreadCount?: number
}

export default function MessagesListPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    const fetchConversations = async () => {
      if (!session?.user?.id) return

      try {
        setLoading(true)
        setError(null)

        // Fetch user's conversations from your API
        const response = await fetch("/api/conversations")
        if (!response.ok) {
          throw new Error("Failed to fetch conversations")
        }

        const data = await response.json()
        setConversations(data.conversations || [])
      } catch (err) {
        console.error("Failed to fetch conversations:", err)
        setError(err instanceof Error ? err.message : "Failed to load conversations")
      } finally {
        setLoading(false)
      }
    }

    fetchConversations()
  }, [session?.user?.id])

  const filteredConversations = conversations.filter(conv =>
    conv.otherUser.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (conv.otherUser.nickname && conv.otherUser.nickname.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const formatLastMessageTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 1) {
      return "now"
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h`
    } else {
      return date.toLocaleDateString()
    }
  }

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-5rem)] md:h-[calc(100vh-4rem)] items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading conversations...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-[calc(100vh-5rem)] md:h-[calc(100vh-4rem)] items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button
            className="rounded-full bg-blue-600 hover:bg-blue-700"
            onClick={() => window.location.reload()}
          >
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-5rem)] md:h-[calc(100vh-4rem)] flex-col bg-gradient-to-br from-blue-50 via-white to-blue-50">
      {/* Header */}
      <div className="border-b bg-white/80 backdrop-blur-sm p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-blue-600">Messages</h1>
          <Button
            className="rounded-full bg-blue-600 hover:bg-blue-700"
            onClick={() => router.push("/users")} // Navigate to users list to start new conversation
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            New Chat
          </Button>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-full border-blue-200 focus:border-blue-400"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <MessageCircle className="h-16 w-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">
              {searchQuery ? "No conversations found" : "No conversations yet"}
            </h3>
            <p className="text-gray-500 mb-6">
              {searchQuery 
                ? "Try adjusting your search terms" 
                : "Start a conversation with someone to see it here"
              }
            </p>
            {!searchQuery && (
              <Button
                className="rounded-full bg-blue-600 hover:bg-blue-700"
                onClick={() => router.push("/users")}
              >
                Find People to Chat With
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-blue-100">
            {filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                className="p-4 hover:bg-white/50 cursor-pointer transition-colors"
                onClick={() => router.push(`/messages/${conversation.otherUser.id}`)}
              >
                <div className="flex items-center gap-3">
                  {/* User Avatar */}
                  <div className="relative h-12 w-12 overflow-hidden rounded-full border-2 border-blue-200 flex-shrink-0">
                    {conversation.otherUser.image ? (
                      <Image
                        src={conversation.otherUser.image}
                        alt={conversation.otherUser.username}
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    ) : (
                      <div className="w-full h-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                        {conversation.otherUser.username[0]?.toUpperCase() || "?"}
                      </div>
                    )}
                    {conversation.unreadCount && conversation.unreadCount > 0 && (
                      <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {conversation.unreadCount > 9 ? "9+" : conversation.unreadCount}
                      </div>
                    )}
                  </div>

                  {/* Conversation Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-medium text-blue-600 truncate">
                        {conversation.otherUser.nickname || conversation.otherUser.username}
                      </h3>
                      {conversation.lastMessage && (
                        <span className="text-xs text-gray-500 flex-shrink-0">
                          {formatLastMessageTime(conversation.lastMessage.timestamp)}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {conversation.otherUser.nickname && (
                        <span className="text-xs text-gray-400">@{conversation.otherUser.username}</span>
                      )}
                    </div>
                    
                    {conversation.lastMessage && (
                      <p className="text-sm text-gray-600 truncate mt-1">
                        {conversation.lastMessage.senderId === session?.user?.id ? "You: " : ""}
                        {conversation.lastMessage.text}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}