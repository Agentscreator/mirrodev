"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Search, MessageCircle, RefreshCw } from "lucide-react"
import { useSession } from "next-auth/react"

interface ConversationUser {
  id: string
  username: string
  nickname?: string
  image?: string
}

interface Conversation {
  id: string
  user: ConversationUser
  lastMessage?: string
  timestamp?: string
  unread: boolean
}

export default function MessagesPage() {
  const { data: session, status } = useSession()
  const [searchQuery, setSearchQuery] = useState("")
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch conversations from your API
  const fetchConversations = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('Fetching conversations...')
      
      const response = await fetch('/api/stream/conversations', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      console.log('Response status:', response.status)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      console.log('Conversations data:', data)
      
      setConversations(data.conversations || [])
    } catch (err) {
      console.error('Error fetching conversations:', err)
      setError(err instanceof Error ? err.message : 'Failed to load conversations')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Only fetch when we have a session
    if (status === 'authenticated' && session?.user?.id) {
      fetchConversations()
    } else if (status === 'unauthenticated') {
      setError('You must be logged in to view messages')
      setLoading(false)
    }
  }, [session, status])

  const filteredConversations = conversations.filter((convo) =>
    convo.user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (convo.user.nickname && convo.user.nickname.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return ""
    
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: "short" })
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" })
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex h-[calc(100vh-5rem)] md:h-[calc(100vh-4rem)] flex-col messages-doodle-bg">
        <div className="border-b border-blue-100/50 p-4">
          <h1 className="mb-4 text-2xl font-bold text-blue-600">Messages</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              className="pl-10 premium-input"
              disabled
            />
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">
              {status === 'loading' ? 'Loading session...' : 'Loading conversations...'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-[calc(100vh-5rem)] md:h-[calc(100vh-4rem)] flex-col messages-doodle-bg">
        <div className="border-b border-blue-100/50 p-4">
          <h1 className="mb-4 text-2xl font-bold text-blue-600">Messages</h1>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <h2 className="text-xl font-semibold text-red-600 mb-2">Error</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => fetchConversations()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <div className="flex h-[calc(100vh-5rem)] md:h-[calc(100vh-4rem)] flex-col messages-doodle-bg">
        <div className="border-b border-blue-100/50 p-4">
          <h1 className="mb-4 text-2xl font-bold text-blue-600">Messages</h1>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-blue-600">Not Signed In</h2>
            <p className="mt-2 text-gray-600">Please sign in to view your messages.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-5rem)] md:h-[calc(100vh-4rem)] flex-col messages-doodle-bg">
      {/* Header */}
      <div className="border-b border-blue-100/50 p-4">
        <h1 className="mb-4 text-2xl font-bold text-blue-600">Messages</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            className="pl-10 premium-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto p-2 premium-scrollbar">
        {filteredConversations.length > 0 ? (
          <div className="space-y-2">
            {filteredConversations.map((convo) => (
              <Link href={`/authenticated/messages/${convo.user.id}`} key={convo.id} className="block">
                <div className="cursor-pointer rounded-xl p-3 transition-colors hover:bg-blue-500/10">
                  <div className="flex items-start gap-3">
                    <div className="relative">
                      <div className="relative h-12 w-12 overflow-hidden rounded-full premium-avatar">
                        {convo.user.image ? (
                          <Image
                            src={convo.user.image}
                            alt={convo.user.username}
                            fill
                            className="object-cover"
                            sizes="48px"
                          />
                        ) : (
                          <div className="w-full h-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                            {convo.user.username[0]?.toUpperCase() || '?'}
                          </div>
                        )}
                      </div>
                      {convo.unread && (
                        <span className="absolute right-0 top-0 h-3 w-3 rounded-full bg-blue-500 blue-glow"></span>
                      )}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-blue-600">
                          {convo.user.nickname || convo.user.username}
                        </h3>
                        <span className="text-xs premium-text-muted">
                          {formatTimestamp(convo.timestamp)}
                        </span>
                      </div>
                      <p className="truncate text-sm premium-text-muted">
                        {convo.lastMessage || "Start a new conversation"}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center p-8 text-center">
            <div className="mb-6 h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
              <MessageCircle className="h-8 w-8 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-blue-600">
              {searchQuery ? "No conversations found" : "No messages yet"}
            </h2>
            <p className="mt-2 max-w-md text-gray-600">
              {searchQuery 
                ? "Try searching with a different term or start a new conversation from the Discover page."
                : "Start connecting with people from the Discover page to begin conversations."
              }
            </p>
          </div>
        )}
      </div>
    </div>
  )
}