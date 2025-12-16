import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { WelcomeClient } from "./welcome-client";
import { PropertyService } from "@/lib/services/property.service";
import { RoleService } from "@/lib/services/role.service";
import { UserService } from "@/lib/services/user.service";

export const dynamic = "force-dynamic";

export default async function WelcomePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const userName = session.user.email?.split("@")[0] || "User";
  const userRole = session.user.roleCode || "";
  const userOwnerId = session.user.ownerId || null;

  // Filter properties berdasarkan role:
  // - DEVELOPER: semua property
  // - OWNER/OWNERGROUP: hanya property milik ownerId mereka
  const filterOwnerId = 
    (userRole === "OWNER" || userRole === "OWNERGROUP") && userOwnerId
      ? userOwnerId
      : null;

  const [properties, roles, owners] = await Promise.all([
    PropertyService.findAll(false, filterOwnerId),
    Promise.resolve(RoleService.findAllActive()),
    UserService.findOwners(),
  ]);

  return (
    <WelcomeClient
      userName={userName}
      userRole={userRole}
      properties={properties}
      roles={roles}
      owners={owners}
      currentUserOwnerId={userOwnerId}
    />
  );
}
