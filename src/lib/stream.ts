// src/lib/stream.ts
import { StreamChat } from 'stream-chat';

// Initialize Stream Chat client
export const streamClient = StreamChat.getInstance(process.env.NEXT_PUBLIC_STREAM_API_KEY!);

// Helper function to connect user to Stream
export const connectUserToStream = async (userId: string, username: string, token: string, image?: string) => {
  try {
    const user = {
      id: userId,
      name: username,
      image: image || undefined,
    };

    await streamClient.connectUser(user, token);
    return true;
  } catch (error) {
    console.error('Failed to connect user to Stream:', error);
    return false;
  }
};

// Helper function to disconnect user from Stream
export const disconnectUserFromStream = async () => {
  try {
    await streamClient.disconnectUser();
  } catch (error) {
    console.error('Failed to disconnect user from Stream:', error);
  }
};