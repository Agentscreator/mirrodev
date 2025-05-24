// components/providers/StreamProvider.tsx
"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { StreamChat } from 'stream-chat';
import { useSession } from 'next-auth/react';

interface StreamContextValue {
  client: StreamChat | null;
  isReady: boolean;
  error: string | null;
}

const StreamContext = createContext<StreamContextValue>({
  client: null,
  isReady: false,
  error: null,
});

export const useStreamContext = () => {
  const context = useContext(StreamContext);
  if (!context) {
    throw new Error('useStreamContext must be used within a StreamProvider');
  }
  return context;
};

interface StreamProviderProps {
  children: ReactNode;
}

export function StreamProvider({ children }: StreamProviderProps) {
  const [client, setClient] = useState<StreamChat | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session?.user) {
      setClient(null);
      setIsReady(false);
      return;
    }

    const initializeStream = async () => {
      try {
        setError(null);
        
        const streamClient = StreamChat.getInstance(
          process.env.NEXT_PUBLIC_STREAM_API_KEY!
        );

        // Get token from our API
        const tokenResponse = await fetch('/api/stream/token', {
          method: 'POST',
        });

        if (!tokenResponse.ok) {
          throw new Error('Failed to get Stream token');
        }

        const { token } = await tokenResponse.json();

        // Connect user to Stream
        await streamClient.connectUser(
          {
            id: session.user.id,
            name: session.user.username || session.user.name || 'User',
            image: session.user.image || undefined,
          },
          token
        );

        setClient(streamClient);
        setIsReady(true);
      } catch (err) {
        console.error('Stream initialization error:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize chat');
        setIsReady(false);
      }
    };

    initializeStream();

    // Cleanup function
    return () => {
      if (client) {
        client.disconnectUser();
        setClient(null);
        setIsReady(false);
      }
    };
  }, [session, status]);

  return (
    <StreamContext.Provider value={{ client, isReady, error }}>
      {children}
    </StreamContext.Provider>
  );
}
