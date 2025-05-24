"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, ArrowLeft } from "lucide-react"
import { Channel, ChannelHeader, MessageInput, MessageList, Thread, Window } from 'stream-chat-react'
import { streamClient } from '@/src/lib/stream'
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

  useEffect(() => {
    const initializeChat = async () => {
      if (!streamClient.userID || !userId) return

      try {
        setLoading(true)

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

        // Get the channel from Stream
        const members = [streamClient.userID, userId].sort()
        const channelId = members.join('-')
        
        const streamChannel = streamClient.channel('messaging', channelId, {
          members: members,
        })

        await streamChannel.watch()
        setChannel(streamChannel)
      } catch (err) {
        console.error('Chat initialization error:', err)
        setError('Failed to load conversation')
      } finally {
        setLoading(false)
      }
    }

    initializeChat()
  }, [userId])

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
      {/* Custom Header with styling */}
      <div className="border-b glass-effect p-4">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full mr-1" 
            onClick={() => router.push('/authenticated/messages')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="relative h-10 w-10 overflow-hidden rounded-full premium-avatar">
            {user.image ? (
              <Image
                src={user.image}
                alt={user.username}
                fill
                className="object-cover"
                sizes="40px"
              />
            ) : (
              <div className="w-full h-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                {user.username[0]?.toUpperCase() || '?'}
              </div>
            )}
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-blue-600">
              {user.nickname || user.username}
            </h3>
            <p className="text-xs premium-text-muted">
              {user.nickname ? `@${user.username}` : 'Online'}
            </p>
          </div>
        </div>
      </div>

      {/* Stream Chat Integration with custom styling */}
      <div className="flex-1 flex stream-chat-custom">
        <Channel channel={channel}>
          <Window>
            <div className="str-chat__main-panel" style={{ height: '100%' }}>
              <MessageList />
              <div className="border-t glass-effect p-4">
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
