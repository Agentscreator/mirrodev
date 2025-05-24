// app/api/stream/channel/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/src/lib/auth';
import { StreamChat } from 'stream-chat';

const serverClient = StreamChat.getInstance(
  process.env.NEXT_PUBLIC_STREAM_API_KEY!,
  process.env.STREAM_SECRET_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { recipientId } = await request.json();
    
    if (!recipientId) {
      return NextResponse.json({ error: 'Recipient ID is required' }, { status: 400 });
    }

    const currentUserId = session.user.id;
    
    // Create a consistent channel ID by sorting user IDs
    const members = [currentUserId, recipientId].sort();
    const channelId = members.join('-');

    // Create or get the channel - Fix: Pass options object, not string
    const channel = serverClient.channel('messaging', channelId, {
      members: members,
      created_by_id: currentUserId,
    });

    // Fix: Call create() without parameters - Stream will use server client auth
    await channel.create();

    return NextResponse.json({ 
      channelId,
      success: true 
    });
  } catch (error) {
    console.error('Channel creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create channel' },
      { status: 500 }
    );
  }
}
