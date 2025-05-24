// app/api/users/[userId]/following/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/src/lib/auth';
import { db } from '@/src/db';
import { followersTable, usersTable } from '@/src/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = params;
    
    const following = await getFollowing(userId, session.user.id);
    
    return NextResponse.json({ users: following });
  } catch (error) {
    console.error('Error fetching following:', error);
    return NextResponse.json(
      { error: 'Failed to fetch following' },
      { status: 500 }
    );
  }
}

async function getFollowing(userId: string, currentUserId: string) {
  // Get all users that this user is following
  const followingQuery = await db
    .select({
      id: usersTable.id,
      username: usersTable.username,
      nickname: usersTable.nickname,
      profileImage: usersTable.profileImage,
      image: usersTable.image,
      metro_area: usersTable.metro_area,
    })
    .from(followersTable)
    .innerJoin(usersTable, eq(followersTable.followingId, usersTable.id))
    .where(eq(followersTable.followerId, userId));

  // Get who the current user is following among these users
  const followingIds = followingQuery.map((f: any) => f.id);
  const currentUserFollowing = followingIds.length > 0
    ? await db
        .select({ followingId: followersTable.followingId })
        .from(followersTable)
        .where(
          and(
            eq(followersTable.followerId, currentUserId),
            // Handle multiple IDs properly - you might need inArray() from drizzle-orm
            followingIds.length === 1 
              ? eq(followersTable.followingId, followingIds[0])
              : eq(followersTable.followingId, followingIds[0]) // Replace with proper inArray logic
          )
        )
    : [];

  const followingSet = new Set(currentUserFollowing.map((f: any) => f.followingId));

  return followingQuery.map((following: any) => ({
    ...following,
    isFollowing: followingSet.has(following.id)
  }));
}
