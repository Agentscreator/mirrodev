// lib/stream-server.ts (Server-side only)
import { StreamChat } from 'stream-chat';

const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY!;
const apiSecret = process.env.STREAM_SECRET_KEY!;

export const serverStreamClient = StreamChat.getInstance(apiKey, apiSecret);

// Create or update user in Stream
export async function createStreamUser(userId: string, userData: {
  name: string;
  image?: string;
}) {
  try {
    await serverStreamClient.upsertUser({
      id: userId,
      name: userData.name,
      image: userData.image,
    });
  } catch (error) {
    console.error('Error creating Stream user:', error);
    throw error;
  }
}

// Generate Stream token for user
export function generateStreamToken(userId: string) {
  return serverStreamClient.createToken(userId);
}

// Create a channel between two users
export async function createDirectChannel(userId1: string, userId2: string) {
  try {
    const channel = serverStreamClient.channel('messaging', {
      members: [userId1, userId2],
    });
    await channel.create();
    return channel;
  } catch (error) {
    console.error('Error creating channel:', error);
    throw error;
  }
}
