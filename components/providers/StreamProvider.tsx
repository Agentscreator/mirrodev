// components/providers/StreamProvider.tsx
"use client"

import { useEffect, useState, createContext, useContext } from 'react';
import { StreamChat } from 'stream-chat';
import { Chat } from 'stream-chat-react';
import { useSession } from 'next-auth/react'; // Adjust based on your auth
import { streamClient } from '@/src/lib/stream';

interface StreamContextValue {
  client: StreamChat | null;
  isReady: boolean;
}

const StreamContext = createContext<StreamContextValue>({
  client: null,
  isReady: false,
});

export const useStreamContext = () => useContext(StreamContext);

interface StreamProviderProps {
  children: React.ReactNode;
}

export function StreamProvider({ children }: StreamProviderProps) {
  const { data: session } = useSession(); // Adjust based on your auth
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const connectUser = async () => {
      if (!session?.user) return;

      try {
        // Check if user is already connected
        if (streamClient.userID) {
          setIsReady(true);
          return;
        }

        // Get Stream token from your API
        const response = await fetch('/api/stream/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: session.user.id }),
        });

        if (!response.ok) {
          throw new Error('Failed to get Stream token');
        }

        const { token } = await response.json();

        // Connect user to Stream
        await streamClient.connectUser(
          {
            id: session.user.id,
            name: session.user.name || session.user.username,
            image: session.user.image || undefined, // Convert null to undefined
          },
          token
        );

        setIsReady(true);
      } catch (error) {
        console.error('Stream connection error:', error);
      }
    };

    connectUser();

    // Cleanup on unmount
    return () => {
      if (streamClient.userID) {
        streamClient.disconnectUser();
      }
    };
  }, [session]);

  const contextValue: StreamContextValue = {
    client: streamClient,
    isReady,
  };

  if (!isReady) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <StreamContext.Provider value={contextValue}>
      <Chat client={streamClient}>
        {children}
      </Chat>
    </StreamContext.Provider>
  );
}