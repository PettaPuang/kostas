import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      roleCode: string; // Enum Role: DEVELOPER, OWNER, OWNERGROUP, STAFF, FINANCE
    } & DefaultSession["user"];
  }

  interface User {
    roleCode: string; // Enum Role
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    roleCode: string; // Enum Role
  }
}
