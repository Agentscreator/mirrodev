// app/api/stream/conversations/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { StreamChat } from 'stream-chat';
import { authOptions } from '@/src/lib/auth';

// Initialize Stream Chat server client with correct env vars
const serverClient = StreamChat.getInstance(
  process.env.NEXT_PUBLIC_STREAM_API_KEY!, // API Key (public)
  process.env.STREAM_SECRET_KEY! // Secret Key (private)
);

export async function GET(request: NextRequest) {
  try {
    // Get the current user session
    const session = await getServerSession(authOptions);
        
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Query channels where the current user is a member
    const filter = {
      type: 'messaging',
      members: { $in: [userId] }
    };

    const sort = [{ last_message_at: -1 as const }];
    const options = {
      state: true,
      watch: false,
      presence: false,
      limit: 50
    };

    const channels = await serverClient.queryChannels(filter, sort, options);

    // Transform channels into the format expected by your frontend
    const conversations = channels.map(channel => {
      // Get the other user in the conversation (assuming 1-on-1 chats)
      const otherUserId = Object.keys(channel.state.members).find(id => id !== userId);
      const otherUser = otherUserId ? channel.state.members[otherUserId]?.user : null;

      // Get the last message
      const lastMessage = channel.state.messages.length > 0 
        ? channel.state.messages[channel.state.messages.length - 1]
        : null;

      // Check if there are unread messages
      const unread = (channel.state.unreadCount || 0) > 0;

      return {
        id: channel.id || channel.cid,
        user: {
          id: otherUserId || 'unknown',
          username: otherUser?.name || otherUser?.id || 'Unknown User',
          nickname: otherUser?.name,
          image: otherUser?.image
        },
        lastMessage: lastMessage?.text || undefined,
        timestamp: lastMessage?.created_at || channel.state.last_message_at,
        unread
      };
    });

    // Filter out conversations where we couldn't find the other user
    const validConversations = conversations.filter(conv => conv.user.id !== 'unknown');

    return NextResponse.json({
      conversations: validConversations,
      total: validConversations.length
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch conversations',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

