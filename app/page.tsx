import { redirect } from "next/navigation";
import { auth } from "@/auth";

export const dynamic = 'force-dynamic';

export default async function Home() {
  const session = await auth();

  // If user is logged in, redirect to welcome page
  if (session?.user) {
    redirect("/welcome");
  }

  // If user is not logged in, redirect to login page
  redirect("/login");
}
