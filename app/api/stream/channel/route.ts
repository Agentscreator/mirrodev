// app/api/stream/channel/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createDirectChannel } from '@/src/lib/stream-server';
import { auth } from '@/src/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { recipientId } = await request.json();
    
    if (!recipientId) {
      return NextResponse.json({ error: 'Recipient ID required' }, { status: 400 });
    }

    const channel = await createDirectChannel(session.user.id, recipientId);
    
    return NextResponse.json({ 
      channelId: channel.id,
      channelType: channel.type 
    });
  } catch (error) {
    console.error('Create channel error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}