// app/api/users/profile-image/route.ts

import { NextRequest, NextResponse } from "next/server";
// @ts-ignore: no types for busboy’s constructor
import Busboy from "busboy";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";     // your NextAuth config
import { db } from "@/src/db";                    // Drizzle client
import { usersTable } from "@/src/db/schema";     // your users table
import { eq } from "drizzle-orm";

// --- your storage‐upload helper
async function uploadToStorage(options: {
  buffer: Buffer;
  filename: string;
  mimetype: string;
  folder?: string;
}): Promise<string> {
  // TODO: wire this up to your S3 / Cloudinary / etc.
  throw new Error("uploadToStorage() not implemented");
}

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(req: NextRequest) {
  // 1) Auth check
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  // 2) Busboy setup
  const contentType = req.headers.get("content-type") ?? "";
  // @ts-ignore: Busboy has no construct signature in this TS setup
  const busboy = new Busboy({ headers: { "content-type": contentType } });

  let imageUrl: string | null = null;

  const finished = new Promise<void>((resolve, reject) => {
    busboy.on(
      "file",
      (
        _fieldname: string,
        fileStream: NodeJS.ReadableStream,
        filename: string,
        _encoding: string,
        mimetype: string
      ) => {
        const chunks: Buffer[] = [];
        fileStream.on("data", (chunk: Buffer) => chunks.push(chunk));
        fileStream.on("end", async () => {
          try {
            const buffer = Buffer.concat(chunks);
            imageUrl = await uploadToStorage({
              buffer,
              filename,
              mimetype,
              folder: "profile-images",
            });
            resolve();
          } catch (err: any) {
            reject(err);
          }
        });
      }
    );

    // now our explicit any
    busboy.on("error", (err: any) => reject(err));
    busboy.on("finish", () => resolve());

    req
      .arrayBuffer()
      .then((ab) => busboy.end(Buffer.from(ab)))
      .catch((err: any) => reject(err));
  });

  try {
    await finished;
    if (!imageUrl) throw new Error("No file received");

    // 4) Persist to your DB via Drizzle
    await db
      .update(usersTable)
      .set({ profileImage: imageUrl })
      .where(eq(usersTable.id, userId));

    // 5) Return the new URL
    return NextResponse.json({ imageUrl });
  } catch (error: any) {
    console.error("Profile-image upload error:", error);
    return NextResponse.json(
      { error: error.message ?? "Upload failed" },
      { status: 500 }
    );
  }
}
