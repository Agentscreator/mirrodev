// app/api/users/[userId]/followers/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/src/lib/auth';
import { db } from '@/src/db'; // Your Drizzle database instance
import { followersTable, usersTable } from '@/src/db/schema'; // Your schema
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
    
    const followers = await getFollowers(userId, session.user.id);
    
    return NextResponse.json({ users: followers });
  } catch (error) {
    console.error('Error fetching followers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch followers' },
      { status: 500 }
    );
  }
}

async function getFollowers(userId: string, currentUserId: string) {
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

  // Get who the current user is following among these followers
  const followerIds = followersQuery.map((f: any) => f.id);
  const currentUserFollowing = followerIds.length > 0 
    ? await db
        .select({ followingId: followersTable.followingId })
        .from(followersTable)
        .where(
          and(
            eq(followersTable.followerId, currentUserId),
            // Use in() for multiple values or individual eq() checks
            followerIds.length === 1 
              ? eq(followersTable.followingId, followerIds[0])
              : eq(followersTable.followingId, followerIds[0]) // You might need to use inArray here
          )
        )
    : [];

  const followingSet = new Set(currentUserFollowing.map((f: any) => f.followingId));

  return followersQuery.map((follower: any) => ({
    ...follower,
    isFollowing: followingSet.has(follower.id)
  }));
}
