// app/api/users/[userId]/following/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/src/lib/auth';
import { db } from '@/src/db';
import { followersTable, usersTable } from '@/src/db/schema';
import { eq, and, inArray } from 'drizzle-orm';

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

  if (followingQuery.length === 0) {
    return [];
  }

  // Get who the current user is following among these users
  const followingIds = followingQuery.map(f => f.id);
  const currentUserFollowing = await db
    .select({ followingId: followersTable.followingId })
    .from(followersTable)
    .where(
      and(
        eq(followersTable.followerId, currentUserId),
        inArray(followersTable.followingId, followingIds)
      )
    );

  const followingSet = new Set(currentUserFollowing.map(f => f.followingId));

  return followingQuery.map(following => ({
    ...following,
    isFollowing: followingSet.has(following.id)
  }));
}