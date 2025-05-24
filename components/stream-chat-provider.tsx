// components/stream-chat-provider.tsx
"use client"

import { useEffect, useState } from 'react';
import { Chat } from 'stream-chat-react';
import { streamClient } from '@/src/lib/stream';
import { useSession } from 'next-auth/react';

interface StreamChatProviderProps {
  children: React.ReactNode;
}

export function StreamChatProvider({ children }: StreamChatProviderProps) {
  const { data: session, status } = useSession();
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initStream = async () => {
      // Wait for session to load
      if (status === 'loading') return;
      
      // If no session, don't try to connect
      if (!session?.user?.id) {
        console.log('No session or user ID available');
        return;
      }

      try {
        console.log('Initializing Stream Chat for user:', session.user.id);
        
        // Get token from your API
        const response = await fetch('/api/stream/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: session.user.id
          })
        });

        if (!response.ok) {
          throw new Error(`Failed to get token: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        if (!data.token) {
          throw new Error('No token received from API');
        }

        console.log('Token received, connecting to Stream...');

        // Connect user to Stream
        await streamClient.connectUser(
          {
            id: session.user.id,
            name: session.user.name || session.user.email || 'User',
            image: session.user.image,
          },
          data.token
        );

        console.log('Stream Chat connected successfully');
        setIsReady(true);
        setError(null);
      } catch (error) {
        console.error('Stream initialization error:', error);
        setError(error instanceof Error ? error.message : 'Unknown error');
      }
    };

    initStream();

    return () => {
      if (streamClient.userID) {
        console.log('Disconnecting Stream Chat user');
        streamClient.disconnectUser();
      }
    };
  }, [session, status]);

  // Show loading state while session is loading
  if (status === 'loading') {
    return <div>{children}</div>;
  }

  // Show error state if there's an error
  if (error) {
    console.warn('Stream Chat Provider Error:', error);
    // Still render children but without Chat wrapper
    return <div>{children}</div>;
  }

  // If no session, render without Chat wrapper
  if (!session || !isReady) {
    return <div>{children}</div>;
  }

  return (
    <Chat client={streamClient}>
      {children}
    </Chat>
  );
}