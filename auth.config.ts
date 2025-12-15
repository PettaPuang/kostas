import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const authConfig = {
  pages: {
    signIn: "/login",
    signOut: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.roleCode = user.roleCode; // Langsung enum Role
      }

      // Validate user exists in database on every token refresh
      // This handles cases where database was reset but session still exists
      if (token.id && !user) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
        });

        // If user not found, invalidate token
        if (!dbUser) {
          console.warn(
            `[JWT] User not found in database (ID: ${token.id}), invalidating session`
          );
          return {}; // Return empty token to invalidate session
        }

        // Update token with latest user data from database
        token.id = dbUser.id;
        token.email = dbUser.email;
        token.roleCode = dbUser.role; // Langsung pakai enum Role
      }

      // Update session
      if (trigger === "update" && session) {
        token = { ...token, ...session };
      }

      return token;
    },
    async session({ session, token }) {
      // If token is empty (user invalidated), return null session
      if (!token || !token.id) {
        return { ...session, user: null } as any;
      }

      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.roleCode = token.roleCode as string; // Langsung enum Role
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Allow relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      // Allow callback URLs on the same origin
      if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
  providers: [
    Credentials({
      async authorize(credentials) {
        try {
          const parsedCredentials = z
            .object({
              email: z.string().email("Email tidak valid"),
              password: z.string().min(6, "Password minimal 6 karakter"),
            })
            .safeParse(credentials);

          if (!parsedCredentials.success) {
            console.log("[AUTH] Validation failed:", parsedCredentials.error);
            return null;
          }

          const { email, password } = parsedCredentials.data;

          // Get user by email
          const user = await prisma.user.findUnique({
            where: { email },
          });

          if (!user) {
            console.log("[AUTH] User not found:", email);
            return null;
          }

          // Verify password
          const passwordMatch = await bcrypt.compare(password, user.password);
          if (!passwordMatch) {
            console.log("[AUTH] Password mismatch for user:", email);
            return null;
          }

          console.log("[AUTH] Login successful for user:", email);

          // Return user data
          return {
            id: user.id,
            email: user.email,
            roleCode: user.role, // Langsung enum Role
          };
        } catch (error) {
          console.error("[AUTH] Authorize error:", error);
          return null;
        }
      },
    }),
  ],
} satisfies NextAuthConfig;
