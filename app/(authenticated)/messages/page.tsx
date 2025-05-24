"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { Channel, ChannelHeader, MessageInput, MessageList, Thread, Window } from 'stream-chat-react'
import { useStreamContext } from '@/components/providers/StreamProvider'
import type { Channel as StreamChannel } from 'stream-chat'
import 'stream-chat-react/dist/css/v2/index.css'

interface User {
  id: string
  username: string
  nickname?: string
  image?: string
}

export default function UserMessagePage() {
  const params = useParams()
  const router = useRouter()
  const userId = params.userId as string
  const [user, setUser] = useState<User | null>(null)
  const [channel, setChannel] = useState<StreamChannel | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { client: streamClient, isReady } = useStreamContext()

  useEffect(() => {
    const initializeChat = async () => {
      if (!streamClient || !streamClient.userID || !userId || !isReady) {
        setLoading(false)
        setError('Chat not ready')
        return
      }

      try {
        setLoading(true)
        setError(null)

        // Fetch user information
        const userResponse = await fetch(`/api/users/${userId}`)
        if (userResponse.ok) {
          const userData = await userResponse.json()
          setUser({
            id: userData.user.id,
            username: userData.user.username,
            nickname: userData.user.nickname,
            image: userData.user.image || userData.user.profileImage
          })
        } else {
          throw new Error('User not found')
        }

        // Create or get existing channel
        const channelResponse = await fetch('/api/stream/channel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recipientId: userId }),
        })

        if (!channelResponse.ok) {
          throw new Error('Failed to create channel')
        }

        const { channelId } = await channelResponse.json()

        // Get the channel from Stream
        const streamChannel = streamClient.channel('messaging', channelId)

        // Watch the channel to subscribe to events
        await streamChannel.watch()
        setChannel(streamChannel)
      } catch (err) {
        console.error('Chat initialization error:', err)
        setError(err instanceof Error ? err.message : 'Failed to load conversation')
      } finally {
        setLoading(false)
      }
    }

    initializeChat()
  }, [userId, streamClient, isReady])

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-5rem)] md:h-[calc(100vh-4rem)] items-center justify-center messages-doodle-bg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading conversation...</p>
        </div>
      </div>
    )
  }

  if (error || !channel) {
    return (
      <div className="flex h-[calc(100vh-5rem)] md:h-[calc(100vh-4rem)] items-center justify-center messages-doodle-bg">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-2">
            {error || 'Conversation not found'}
          </h2>
          <p className="text-gray-600 mb-4">Unable to load this conversation.</p>
          <Button 
            className="rounded-full" 
            onClick={() => router.push('/authenticated/messages')}
          >
            Back to Messages
          </Button>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex h-[calc(100vh-5rem)] md:h-[calc(100vh-4rem)] items-center justify-center messages-doodle-bg">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-blue-600">User not found</h2>
          <p className="mt-2 text-gray-600">This user doesn't exist or has been removed.</p>
          <Button 
            className="mt-4 rounded-full" 
            onClick={() => router.push('/authenticated/messages')}
          >
            Back to Messages
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-5rem)] md:h-[calc(100vh-4rem)] flex-col messages-doodle-bg">
      {/* Custom Header */}
      <div className="border-b glass-effect p-4 bg-white/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full mr-1 hover:bg-blue-50" 
            onClick={() => router.push('/authenticated/messages')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="relative h-10 w-10 overflow-hidden rounded-full">
            {user.image ? (
              <Image
                src={user.image}
                alt={user.username}
                fill
                className="object-cover"
                sizes="40px"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold">
                {user.username[0]?.toUpperCase() || '?'}
              </div>
            )}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">
              {user.nickname || user.username}
            </h3>
            <p className="text-sm text-gray-500">
              {user.nickname ? `@${user.username}` : 'Online'}
            </p>
          </div>
        </div>
      </div>

      {/* Stream Chat Integration */}
      <div className="flex-1 flex stream-chat-custom">
        <Channel channel={channel}>
          <Window>
            <MessageList />
            <MessageInput />
          </Window>
          <Thread />
        </Channel>
      </div>

      <style jsx global>{`
        .stream-chat-custom {
          height: 100%;
        }
        
        .str-chat {
          height: 100%;
        }
        
        .str-chat__main-panel {
          background: transparent;
          height: 100%;
          display: flex;
          flex-direction: column;
        }
        
        .str-chat__message-list {
          background: transparent;
          padding: 1rem;
          flex: 1;
          overflow-y: auto;
        }
        
        .str-chat__message-simple {
          margin-bottom: 1rem;
        }
        
        .str-chat__message-simple__content {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(59, 130, 246, 0.1);
          border-radius: 1rem;
          padding: 0.75rem 1rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        
        .str-chat__message-simple--me .str-chat__message-simple__content {
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .str-chat__input {
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          border-top: 1px solid rgba(59, 130, 246, 0.1);
          padding: 1rem;
        }
        
        .str-chat__input .rta {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(59, 130, 246, 0.2);
          border-radius: 1.5rem;
          padding: 0.75rem 1rem;
          min-height: 44px;
        }
        
        .str-chat__input .rta textarea {
          background: transparent;
          border: none;
          outline: none;
          resize: none;
        }
        
        .str-chat__send-button {
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          border-radius: 50%;
          width: 2.5rem;
          height: 2.5rem;
          margin-left: 0.5rem;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .str-chat__send-button:hover {
          background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%);
          transform: scale(1.05);
        }
        
        .str-chat__send-button svg {
          color: white;
        }
        
        /* Message bubbles styling */
        .str-chat__message-text {
          line-height: 1.4;
        }
        
        .str-chat__message-metadata {
          font-size: 0.75rem;
          color: rgba(0, 0, 0, 0.5);
          margin-top: 0.25rem;
        }
        
        .str-chat__message-simple--me .str-chat__message-metadata {
          color: rgba(255, 255, 255, 0.7);
        }
        
        /* Avatar styling */
        .str-chat__avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          margin-right: 0.5rem;
        }
        
        /* Thread styling */
        .str-chat__thread {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-left: 1px solid rgba(59, 130, 246, 0.1);
        }
        
        /* Scrollbar styling */
        .str-chat__message-list::-webkit-scrollbar {
          width: 6px;
        }
        
        .str-chat__message-list::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .str-chat__message-list::-webkit-scrollbar-thumb {
          background: rgba(59, 130, 246, 0.3);
          border-radius: 3px;
        }
        
        .str-chat__message-list::-webkit-scrollbar-thumb:hover {
          background: rgba(59, 130, 246, 0.5);
        }
        
        /* Message reactions */
        .str-chat__reaction-list {
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          border-radius: 1rem;
          padding: 0.25rem;
        }
        
        /* Message status indicators */
        .str-chat__message-status {
          font-size: 0.75rem;
          color: rgba(0, 0, 0, 0.4);
        }
        
        /* Loading indicator */
        .str-chat__loading-indicator {
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          border-radius: 0.5rem;
          padding: 0.5rem;
        }
      `}</style>
    </div>
  )
}