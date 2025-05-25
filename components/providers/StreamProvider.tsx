// components/providers/StreamProvider.tsx
"use client"

import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { StreamChat } from 'stream-chat'
import type { User } from 'stream-chat'

interface StreamContextType {
  client: StreamChat | null
  isReady: boolean
  error: string | null
  user: User | null
}

const StreamContext = createContext<StreamContextType>({
  client: null,
  isReady: false,
  error: null,
  user: null
})

export const useStreamContext = () => {
  const context = useContext(StreamContext)
  if (!context) {
    throw new Error('useStreamContext must be used within StreamProvider')
  }
  return context
}

interface StreamProviderProps {
  children: React.ReactNode
  userId?: string
  userToken?: string
  userData?: any
}

export function StreamProvider({ children, userId, userToken, userData }: StreamProviderProps) {
  const [client, setClient] = useState<StreamChat | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const initializingRef = useRef(false)
  const clientRef = useRef<StreamChat | null>(null)

  useEffect(() => {
    const initializeStream = async () => {
      // Prevent multiple initializations
      if (initializingRef.current || !userId || !userToken) {
        return
      }

      // If client already exists and is connected, don't reinitialize
      if (clientRef.current?.userID === userId) {
        return
      }

      try {
        initializingRef.current = true
        setError(null)
        setIsReady(false)

        // Disconnect existing client if any
        if (clientRef.current) {
          try {
            await clientRef.current.disconnectUser()
          } catch (err) {
            console.warn('Error disconnecting previous client:', err)
          }
          clientRef.current = null
        }

        // Create new client instance
        const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY
        if (!apiKey) {
          throw new Error('Stream API key not found')
        }

        const streamClient = StreamChat.getInstance(apiKey)
        
        // Prepare user data
        const streamUser: User = {
          id: userId,
          name: userData?.nickname || userData?.username || userId,
          image: userData?.image || userData?.profileImage,
          ...userData
        }

        // Connect user
        await streamClient.connectUser(streamUser, userToken)
        
        clientRef.current = streamClient
        setClient(streamClient)
        setUser(streamUser)
        setIsReady(true)

      } catch (err) {
        console.error('Stream initialization error:', err)
        setError(err instanceof Error ? err.message : 'Failed to initialize chat')
      } finally {
        initializingRef.current = false
      }
    }

    initializeStream()

    // Cleanup function
    return () => {
      if (clientRef.current && !initializingRef.current) {
        clientRef.current.disconnectUser().catch(console.warn)
        clientRef.current = null
      }
    }
  }, [userId, userToken, userData])

  // Handle component unmount
  useEffect(() => {
    return () => {
      if (clientRef.current) {
        clientRef.current.disconnectUser().catch(console.warn)
      }
    }
  }, [])

  const contextValue: StreamContextType = {
    client,
    isReady,
    error,
    user
  }

  return (
    <StreamContext.Provider value={contextValue}>
      {children}
    </StreamContext.Provider>
  )
}