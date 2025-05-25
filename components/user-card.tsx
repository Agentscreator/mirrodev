"use client"

import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { MessageSquare, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { AnimatedText } from "@/components/animated-text"
import { Badge } from "@/components/ui/badge"
import { useChatContext } from 'stream-chat-react'
import { useState } from 'react'

interface UserCardProps {
  user: {
    id: string | number
    username: string
    image: string
    reason?: string
    tags: string[]
  }
  onMessage?: (channelId?: string) => void
  onViewProfile?: () => void
  isMessaging?: boolean
}

export function UserCard({ user, onMessage, onViewProfile, isMessaging = false }: UserCardProps) {
  const { client } = useChatContext()
  const [isCreatingDM, setIsCreatingDM] = useState(false)
  const usernameInitial = user.username.charAt(0).toUpperCase()

  const handleMessage = async () => {
    if (!client || isCreatingDM) return
    
    setIsCreatingDM(true)
    
    try {
      // Get the current user
      const currentUser = client.userID
      if (!currentUser) {
        console.error('No current user found')
        return
      }

      // Create or get existing DM channel
      // Generate a consistent channel ID for DM between these two users
      const channelId = [currentUser, user.id.toString()].sort().join('-')
      
      const channel = client.channel('messaging', channelId, {
        members: [currentUser, user.id.toString()],
        // Optional: Add custom data
        created_by_id: currentUser,
      })

      // Watch the channel to make it active
      await channel.watch()

      // Call the onMessage callback with the channel ID
      if (onMessage) {
        onMessage(channel.id)
      }

      console.log('DM channel created/retrieved:', channel.id)
      
    } catch (error) {
      console.error('Error creating DM channel:', error)
    } finally {
      setIsCreatingDM(false)
    }
  }

  const handleViewProfile = () => {
    if (onViewProfile) {
      onViewProfile()
    }
  }

  const isButtonDisabled = isMessaging || isCreatingDM

  return (
    <Card className="border border-blue-100 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1">
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:gap-4">
          <div className="relative mx-auto mb-4 h-20 w-20 flex-shrink-0 overflow-hidden rounded-full shadow-md border-2 border-blue-200 sm:mx-0 sm:mb-0 sm:h-16 sm:w-16">
            <Image
              src={user.image || "/placeholder.svg"}
              alt={user.username}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 80px, 64px"
            />
          </div>
          <div className="flex-1">
            <h3 className="mb-2 text-center text-xl font-semibold text-blue-600 sm:mb-0 sm:text-left">
              @{user.username}
            </h3>
            {user.reason && (
              <div className="mt-2">
                <h4 className="font-medium text-blue-600 text-center sm:text-left">The Thread Between You:</h4>
                <div className="mt-1">
                  <AnimatedText text={user.reason} delay={500} speed={20} />
                </div>
              </div>
            )}
            {user.tags.length > 0 && (
              <div className="mt-4">
                <h4 className="mb-2 text-sm font-medium text-blue-600 text-center sm:text-left">Tags:</h4>
                <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                  {user.tags.map((tag, index) => (
                    <Badge 
                      key={index} 
                      className="rounded-full font-medium text-xs px-2 py-0.5 tag-hover bg-blue-50 text-blue-600 border-blue-200"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-4 flex justify-center sm:justify-end items-center gap-2">
              <Button 
                onClick={handleMessage}
                disabled={isButtonDisabled}
                className="rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1 disabled:opacity-50"
              >
                {isButtonDisabled ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <MessageSquare className="h-4 w-4" />
                )}
                <span>{isCreatingDM ? 'Creating...' : 'Message'}</span>
              </Button>
              <Button
                onClick={handleViewProfile}
                variant="outline"
                className="rounded-full border-blue-200 hover:bg-blue-50 flex items-center gap-1"
              >
                <User className="h-4 w-4" />
                <span>Profile</span>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}