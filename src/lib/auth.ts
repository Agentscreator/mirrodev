// src/lib/auth.ts
import { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth/next";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "../db";
import { usersTable } from "../db/schema";
import { eq, or } from "drizzle-orm";
import { compare } from "bcrypt";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.password) {
          return null;
        }

        // Check if we have either email or username
        const { email, username, password } = credentials;
        const identifier = email || username;

        if (!identifier) {
          return null;
        }

        // Query user by either email or username
        const user = await db
          .select()
          .from(usersTable)
          .where(
            or(
              eq(usersTable.email, identifier),
              eq(usersTable.username, identifier)
            )
          )
          .limit(1);

        if (!user[0]) {
          return null;
        }

        const passwordMatch = await compare(password, user[0].password);

        if (!passwordMatch) {
          return null;
        }

        return {
          id: user[0].id.toString(), // Ensure id is string
          email: user[0].email,
          username: user[0].username,
          image: user[0].image || null,
        };
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.name = token.name;
        session.user.email = token.email;
        session.user.username = token.username;
        session.user.image = token.image;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.username;
        token.username = user.username;
        token.image = user.image;
      }
      return token;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

// Export the auth function that can be used in API routes
export const auth = () => getServerSession(authOptions);

// Updated TypeScript declarations
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      username: string;
      image?: string | null;
    };
  }

  interface User {
    id: string;
    email: string;
    username: string;
    image?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    email: string;
    name: string;
    username: string;
    image?: string | null;
  }
}