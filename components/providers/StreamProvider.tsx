"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState, useRef } from "react"
import { StreamChat } from "stream-chat"
import type { User } from "stream-chat"
import { useSession } from "next-auth/react"

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
  user: null,
})

export const useStreamContext = () => {
  const context = useContext(StreamContext)
  if (!context) {
    throw new Error("useStreamContext must be used within StreamProvider")
  }
  return context
}

interface StreamProviderProps {
  children: React.ReactNode
}

export function StreamProvider({ children }: StreamProviderProps) {
  const { data: session, status } = useSession()
  const [client, setClient] = useState<StreamChat | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const initializingRef = useRef(false)
  const clientRef = useRef<StreamChat | null>(null)

  useEffect(() => {
    const initializeStream = async () => {
      // Wait for session to be loaded
      if (status === "loading") {
        return
      }

      // If no session, clear everything
      if (!session?.user?.id) {
        if (clientRef.current) {
          try {
            await clientRef.current.disconnectUser()
          } catch (err) {
            console.warn("Error disconnecting client:", err)
          }
          clientRef.current = null
        }
        setClient(null)
        setIsReady(false)
        setUser(null)
        setError(null)
        return
      }

      // Prevent multiple initializations
      if (initializingRef.current) {
        return
      }

      // If client already exists and is connected to the same user, don't reinitialize
      if (clientRef.current?.userID === session.user.id && isReady) {
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
            console.warn("Error disconnecting previous client:", err)
          }
          clientRef.current = null
        }

        // Create new client instance
        const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY
        if (!apiKey) {
          throw new Error("Stream API key not found")
        }

        const streamClient = StreamChat.getInstance(apiKey)

        // Get token from API
        const tokenResponse = await fetch("/api/stream/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        })

        if (!tokenResponse.ok) {
          throw new Error("Failed to get Stream token")
        }

        const { token } = await tokenResponse.json()

        // Prepare user data
        const streamUser: User = {
          id: session.user.id,
          name: session.user.name || session.user.email || session.user.id,
          image: session.user.image || undefined,
        }

        // Connect user
        await streamClient.connectUser(streamUser, token)

        clientRef.current = streamClient
        setClient(streamClient)
        setUser(streamUser)
        setIsReady(true)
      } catch (err) {
        console.error("Stream initialization error:", err)
        setError(err instanceof Error ? err.message : "Failed to initialize chat")
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
  }, [session, status, isReady])

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
    user,
  }

  return <StreamContext.Provider value={contextValue}>{children}</StreamContext.Provider>
}