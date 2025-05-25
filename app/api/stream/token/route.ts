// app/api/stream/token/route.ts
import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/src/lib/auth"
import { StreamChat } from "stream-chat"

// ✅ Fixed: Use non-public env vars for server
const serverClient = StreamChat.getInstance(
  process.env.STREAM_API_KEY!,     // Changed from NEXT_PUBLIC_STREAM_API_KEY
  process.env.STREAM_SECRET_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    const token = serverClient.createToken(userId)

    return NextResponse.json({ token })
  } catch (error) {
    console.error("Token generation error:", error)
    return NextResponse.json({ error: "Failed to generate token" }, { status: 500 })
  }
}
