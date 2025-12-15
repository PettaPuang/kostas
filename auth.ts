import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

// Get AUTH_SECRET from environment
const getAuthSecret = () => {
  if (process.env.AUTH_SECRET) {
    return process.env.AUTH_SECRET;
  }
  
  throw new Error(
    "AUTH_SECRET is required. Please set it in your .env.local or .env file."
  );
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  secret: getAuthSecret(),
});

