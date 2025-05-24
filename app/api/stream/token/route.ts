// app/api/stream/token/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { StreamChat } from 'stream-chat';
import { authOptions } from '@/src/lib/auth';

// Initialize Stream Chat server client with correct env vars
const serverClient = StreamChat.getInstance(
  process.env.NEXT_PUBLIC_STREAM_API_KEY!, // API Key (public)
  process.env.STREAM_SECRET_KEY! // Secret Key (private)
);

export async function POST(request: NextRequest) {
  try {
    // Get the current user session
    const session = await getServerSession(authOptions);
        
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const userId = body.userId || session.user.id;

    // Validate that the user is requesting a token for themselves
    if (userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Cannot generate token for another user' },
        { status: 403 }
      );
    }

    // Generate token for the user
    const token = serverClient.createToken(userId);

    // Upsert the user in Stream Chat
    await serverClient.upsertUser({
      id: userId,
      name: session.user.username || session.user.name || session.user.email || 'User',
      image: session.user.image,
    });

    // Return both token and API key for client initialization
    return NextResponse.json({ 
      token,
      apiKey: process.env.NEXT_PUBLIC_STREAM_API_KEY
    });
  } catch (error) {
    console.error('Error generating Stream token:', error);
    return NextResponse.json(
      { error: 'Failed to generate token', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
        
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = serverClient.createToken(session.user.id);

    // Upsert the user in Stream Chat
    await serverClient.upsertUser({
      id: session.user.id,
      name: session.user.username || session.user.name || session.user.email || 'User',
      image: session.user.image,
    });

    return NextResponse.json({ 
      token,
      apiKey: process.env.NEXT_PUBLIC_STREAM_API_KEY
    });
  } catch (error) {
    console.error('Error generating Stream token:', error);
    return NextResponse.json(
      { error: 'Failed to generate token', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}