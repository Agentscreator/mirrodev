// app/api/posts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/src/lib/auth';
import { db } from '@/src/db';
import { postsTable, usersTable } from '@/src/db/schema';
import { desc, eq } from 'drizzle-orm';

// GET - Fetch posts
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    let posts;
    if (userId) {
      // Fetch posts for a specific user with user info
      posts = await db.select({
        id: postsTable.id,
        userId: postsTable.userId,
        content: postsTable.content,
        image: postsTable.image,
        createdAt: postsTable.createdAt,
        updatedAt: postsTable.updatedAt,
        user: {
          username: usersTable.username,
          nickname: usersTable.nickname,
          profileImage: usersTable.profileImage,
        }
      })
      .from(postsTable)
      .leftJoin(usersTable, eq(postsTable.userId, usersTable.id))
      .where(eq(postsTable.userId, userId))
      .orderBy(desc(postsTable.createdAt));
    } else {
      // Fetch all posts (for feed) with user info
      posts = await db.select({
        id: postsTable.id,
        userId: postsTable.userId,
        content: postsTable.content,
        image: postsTable.image,
        createdAt: postsTable.createdAt,
        updatedAt: postsTable.updatedAt,
        user: {
          username: usersTable.username,
          nickname: usersTable.nickname,
          profileImage: usersTable.profileImage,
        }
      })
      .from(postsTable)
      .leftJoin(usersTable, eq(postsTable.userId, usersTable.id))
      .orderBy(desc(postsTable.createdAt));
    }

    return NextResponse.json(posts);
  } catch (error) {
    console.error('Fetch posts error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a new post
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
    }).returning();

    return NextResponse.json(post[0]);
  } catch (error) {
    console.error('Create post error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}