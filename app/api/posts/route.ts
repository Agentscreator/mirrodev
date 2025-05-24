// app/api/posts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/src/lib/auth';
import { db } from '@/src/db';
import { postsTable } from '@/src/db/schema'; // You'll need to add this to your schema

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const content = formData.get('content') as string;
    const image = formData.get('image') as File | null;

    let imageUrl = null;
    if (image) {
      // Upload image to your storage service (S3, Cloudinary, etc.)
      // imageUrl = await uploadImage(image);
    }

    const post = await db.insert(postsTable).values({
      userId: session.user.id,
      content,
      image: imageUrl,
      createdAt: new Date(),
    }).returning();

    return NextResponse.json(post[0]);
  } catch (error) {
    console.error('Create post error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}