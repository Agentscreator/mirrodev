// app/api/users/[userId]/followers/route.ts (Enhanced version)
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/src/lib/auth';
import { db } from '@/src/db';
import { followersTable, usersTable } from '@/src/db/schema';
import { eq, and, inArray } from 'drizzle-orm'; // Make sure inArray is available

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
    const followers = await getFollowersEnhanced(userId, session.user.id);
    
    return NextResponse.json({ users: followers });
  } catch (error) {
    console.error('Error fetching followers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch followers' },
      { status: 500 }
    );
  }
}

async function getFollowersEnhanced(userId: string, currentUserId: string) {
  // Get all followers of the user
  const followersQuery = await db
    .select({
      id: usersTable.id,
      username: usersTable.username,
      nickname: usersTable.nickname,
      profileImage: usersTable.profileImage,
      image: usersTable.image,
      metro_area: usersTable.metro_area,
    })
    .from(followersTable)
    .innerJoin(usersTable, eq(followersTable.followerId, usersTable.id))
    .where(eq(followersTable.followingId, userId));

  if (followersQuery.length === 0) {
    return [];
  }

  // Get who the current user is following among these followers
  const followerIds = followersQuery.map((f: any) => f.id);
  const currentUserFollowing = await db
    .select({ followingId: followersTable.followingId })
    .from(followersTable)
    .where(
      and(
        eq(followersTable.followerId, currentUserId),
        inArray(followersTable.followingId, followerIds)
      )
    );

  const followingSet = new Set(currentUserFollowing.map((f: any) => f.followingId));

  return followersQuery.map((follower: any) => ({
    ...follower,
    isFollowing: followingSet.has(follower.id)
  }));
}
