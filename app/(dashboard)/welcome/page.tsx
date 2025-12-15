import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { WelcomeNavbar } from "./navbar";

export const dynamic = 'force-dynamic';

export default async function WelcomePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const userName = session.user.email?.split("@")[0] || "User";
  const userRole = session.user.roleCode || "";

  return (
    <div className="min-h-screen">
      <WelcomeNavbar userName={userName} userRole={userRole} />
    </div>
  );
}
