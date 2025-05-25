// app/(authenticated)/messages/page.tsx
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { MessageCircle, Search, Users, Plus, X, ArrowLeft } from "lucide-react"
import { Input } from "@/components/ui/input"
import { StreamChat, Channel as StreamChannel, UserResponse } from 'stream-chat'
import { 
  Chat, 
  Channel, 
  ChannelList, 
  MessageList, 
  MessageInput, 
  Thread, 
  Window,
  ChannelHeader,
  MessageInputFlat,
  ChannelPreviewUIComponentProps,
  useChatContext
} from 'stream-chat-react'
import type { ChannelSort, ChannelFilters, ChannelOptions } from 'stream-chat'

// Extend the UserResponse type to include nickname
interface ExtendedUserResponse extends UserResponse {
  nickname?: string
}

interface User {
  id: string
  username: string
  nickname?: string
  image?: string
}

// Custom channel preview component
const CustomChannelPreview = (props: ChannelPreviewUIComponentProps) => {
  const { channel, setActiveChannel, unread } = props
  const { setActiveChannel: setChatActiveChannel } = useChatContext()
  
  const handleClick = () => {
    if (setActiveChannel) {
      setActiveChannel(channel)
    } else {
      setChatActiveChannel(channel)
    }
  }

  // Get channel name from members if not set
  const getChannelName = () => {
    // Check if channel has a custom name property - safe access
    const channelData = channel.data as any
    if (channelData?.name) return channelData.name
    
    // Check for other possible name properties
    if (channelData?.display_name) return channelData.display_name
    if (channelData?.channel_name) return channelData.channel_name
    
    // For messaging channels, get the other member's name
    const members = Object.values(channel.state?.members || {})
    const currentUserId = channel._client?.user?.id
    const otherMember = members.find((member: any) => member.user?.id !== currentUserId)
    const otherUser = otherMember?.user as ExtendedUserResponse | undefined
    
    // Return the other member's name (which includes nickname if available), fallback to their ID, or generic name
    return otherUser?.name || 
           otherUser?.id || 
           channel.id || 
           "Conversation"
  }

  // Get channel image from members if not set
  const getChannelImage = () => {
    // Check for channel image first
    const channelData = channel.data as any
    if (channelData?.image) return channelData.image
    
    // For messaging channels, get the other member's image
    const members = Object.values(channel.state?.members || {})
    const currentUserId = channel._client?.user?.id
    const otherMember = members.find((member: any) => member.user?.id !== currentUserId)
    const otherUser = otherMember?.user as ExtendedUserResponse | undefined
    
    return otherUser?.image
  }

  const channelName = getChannelName()
  const channelImage = getChannelImage()
  const lastMessage = channel.state?.messages?.[channel.state.messages.length - 1]

  return (
    <div 
      className="p-4 hover:bg-gray-50 cursor-pointer border-l-4 transition-all border-transparent"
      onClick={handleClick}
    >
      <div className="flex items-center gap-3">
        {/* User Avatar */}
        <div className="relative h-12 w-12 overflow-hidden rounded-full flex-shrink-0">
          {channelImage ? (
            <Image
              src={channelImage}
              alt="Channel"
              fill
              className="object-cover"
              sizes="48px"
            />
          ) : (
            <div className="w-full h-full bg-blue-500 flex items-center justify-center text-white font-semibold">
              {channelName[0]?.toUpperCase() || "#"}
            </div>
          )}
          {unread && unread > 0 && (
            <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </div>
          )}
        </div>

        {/* Channel Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-medium text-gray-900 truncate">
              {channelName}
            </h3>
            {lastMessage && (
              <span className="text-xs text-gray-500 flex-shrink-0">
                {new Date(lastMessage.created_at || '').toLocaleDateString()}
              </span>
            )}
          </div>
          
          {lastMessage && (
            <p className="text-sm text-gray-600 truncate">
              {lastMessage.user?.id === channel._client?.user?.id ? "You: " : ""}
              {lastMessage.text || lastMessage.type}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// Empty state component
const EmptyChannelList = () => (
  <div className="flex flex-col items-center justify-center h-full text-center p-8">
    <MessageCircle className="h-12 w-12 text-gray-300 mb-4" />
    <h3 className="text-lg font-medium text-gray-600 mb-2">No messages yet</h3>
    <p className="text-gray-500 mb-4">Start a conversation to see it here</p>
  </div>
)

export default function MessagesPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showUserSearch, setShowUserSearch] = useState(false)
  const [userSearchQuery, setUserSearchQuery] = useState("")
  const [selectedChannel, setSelectedChannel] = useState<StreamChannel | null>(null)
  const [client, setClient] = useState<StreamChat | null>(null)
  const [isMobile, setIsMobile] = useState(false)

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Initialize Stream Chat
  useEffect(() => {
    const initializeStream = async () => {
      if (!session?.user?.id) return

      try {
        const chatClient = StreamChat.getInstance(process.env.NEXT_PUBLIC_STREAM_API_KEY!)
        
        // Connect user to Stream
        const tokenResponse = await fetch('/api/stream/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })
        
        if (!tokenResponse.ok) {
          throw new Error('Failed to get Stream token')
        }
        
        const { token } = await tokenResponse.json()
        
        // Connect user to Stream Chat - use nickname as the display name
        await chatClient.connectUser(
          {
            id: session.user.id,
            name: (session.user as any).nickname || session.user.username || session.user.name,
            image: session.user.image || undefined,
          },
          token
        )

        setClient(chatClient)
        setLoading(false)
      } catch (err) {
        console.error('Failed to initialize Stream:', err)
        setError('Failed to connect to chat service')
        setLoading(false)
      }
    }

    initializeStream()

    return () => {
      if (client) {
        client.disconnectUser()
      }
    }
  }, [session?.user?.id])

  const fetchUsers = async (query: string) => {
    if (!query.trim()) {
      setUsers([])
      return
    }

    try {
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`)
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users || [])
      }
    } catch (err) {
      console.error("Failed to search users:", err)
    }
  }

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (userSearchQuery) {
        fetchUsers(userSearchQuery)
      }
    }, 300)

    return () => clearTimeout(debounceTimer)
  }, [userSearchQuery])

  const startConversation = async (user: User) => {
    if (!client || !session?.user?.id) return

    try {
      // Create or get existing channel with both users
      const channel = client.channel('messaging', {
        members: [session.user.id, user.id],
      })

      await channel.create()
      
      // Set as selected channel
      setSelectedChannel(channel)
      setShowUserSearch(false)
      setUserSearchQuery("")
      setUsers([])
    } catch (err) {
      console.error("Failed to start conversation:", err)
    }
  }

  // Channel list filters and options
  const filters: ChannelFilters = { 
    type: 'messaging', 
    members: { $in: [session?.user?.id || ''] } 
  }
  
  const sort: ChannelSort = { 
    last_message_at: -1 
  }

  const options: ChannelOptions = {
    limit: 20,
  }

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-5rem)] md:h-[calc(100vh-4rem)] items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading messages...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-[calc(100vh-5rem)] md:h-[calc(100vh-4rem)] items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button
            className="rounded-lg bg-blue-600 hover:bg-blue-700"
            onClick={() => window.location.reload()}
          >
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  if (!client) {
    return (
      <div className="flex h-[calc(100vh-5rem)] md:h-[calc(100vh-4rem)] items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Connecting to chat...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-5rem)] md:h-[calc(100vh-4rem)] bg-white">
      <Chat client={client}>
        {/* Sidebar - Channel List */}
        <div className={`w-full md:w-80 border-r border-gray-200 flex flex-col ${
          selectedChannel && isMobile ? 'hidden' : 'flex'
        }`}>
          {/* Header */}
          <div className="p-4 border-b border-gray-200 bg-white">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl font-semibold text-gray-900">Messages</h1>
              <Button
                size="sm"
                variant="ghost"
                className="rounded-full p-2"
                onClick={() => setShowUserSearch(true)}
              >
                <Plus className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Stream Channel List */}
          <div className="flex-1 overflow-hidden">
            <ChannelList
              filters={filters}
              sort={sort}
              options={options}
              Preview={CustomChannelPreview}
              EmptyStateIndicator={EmptyChannelList}
              setActiveChannelOnMount={false}
            />
          </div>
        </div>

        {/* Main Chat Area */}
        <div className={`flex-1 ${
          !selectedChannel && isMobile ? 'hidden' : 'flex'
        } flex-col`}>
          {selectedChannel ? (
            <>
              {/* Mobile back button */}
              {isMobile && (
                <div className="p-4 border-b border-gray-200 bg-white">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedChannel(null)}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                </div>
              )}
              
              <Channel channel={selectedChannel}>
                <Window>
                  <ChannelHeader />
                  <MessageList />
                  <MessageInput Input={MessageInputFlat} />
                </Window>
                <Thread />
              </Channel>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center p-8 bg-gray-50">
              <div>
                <MessageCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">Select a conversation</h3>
                <p className="text-gray-500">Choose a conversation from the sidebar to start messaging</p>
              </div>
            </div>
          )}
        </div>

        {/* User Search Modal */}
        {showUserSearch && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-md max-h-[80vh] flex flex-col">
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">New Message</h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowUserSearch(false)
                      setUserSearchQuery("")
                      setUsers([])
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search for people..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="pl-10 rounded-lg border-gray-300 focus:border-blue-500"
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-2">
                {userSearchQuery && users.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500">No users found</p>
                  </div>
                ) : userSearchQuery === "" ? (
                  <div className="text-center py-8">
                    <Search className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500">Start typing to search for people</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {users.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer"
                        onClick={() => startConversation(user)}
                      >
                        <div className="h-10 w-10 overflow-hidden rounded-full flex-shrink-0">
                          {user.image ? (
                            <Image
                              src={user.image}
                              alt={user.username}
                              width={40}
                              height={40}
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                              {user.username[0]?.toUpperCase() || "?"}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 truncate">
                            {user.nickname || user.username}
                          </h3>
                          {user.nickname && (
                            <p className="text-sm text-gray-500">@{user.username}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Chat>
    </div>
  )
}