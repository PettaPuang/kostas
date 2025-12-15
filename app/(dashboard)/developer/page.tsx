import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { DeveloperDashboardClient } from "./developer-dashboard-client";
import { UserService } from "@/lib/services/user.service";
import { RoleService } from "@/lib/services/role.service";
import { GasStationService } from "@/lib/services/gas-station.service";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export default async function DeveloperDashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // Hanya DEVELOPER yang bisa akses
  if (session.user.roleCode !== "DEVELOPER") {
    redirect("/welcome");
  }

  const [owners, roles, gasStations] = await Promise.all([
    UserService.findOwners(),
    Promise.resolve(RoleService.findAllActive()),
    GasStationService.findAll(true), // Include inactive untuk developer
  ]);

  // Debug: Log hasTitipan untuk gas station tertentu
  const debugGasStation = gasStations.find((gs) => gs.id === "cmifkglwi00009axwvzqxov2b");
  console.log('🔍 Server - Gas Station data:', {
    id: debugGasStation?.id,
    name: debugGasStation?.name,
    hasTitipan: debugGasStation?.hasTitipan,
    titipanNames: debugGasStation?.titipanNames,
  });

  // Fetch ownergroup dan admin untuk setiap owner
  const ownersWithDetails = await Promise.all(
    owners.map(async (owner) => {
      const [ownerGroups, administrators] = await Promise.all([
        prisma.user.findMany({
          where: {
            role: "OWNER_GROUP",
            ownerId: owner.id,
          },
          include: {
            profile: true,
          },
        }),
        prisma.user.findMany({
          where: {
            role: "ADMINISTRATOR",
            ownerId: owner.id,
          },
          include: {
            profile: true,
          },
        }),
      ]);

      return {
        ...owner,
        ownerGroups: ownerGroups.map((og) => ({
          id: og.id,
          name: og.profile?.name || og.username,
        })),
        administrators: administrators.map((admin) => ({
          id: admin.id,
          name: admin.profile?.name || admin.username,
        })),
      };
    })
  );

  return (
    <DeveloperDashboardClient
      owners={ownersWithDetails}
      roles={roles}
      gasStations={gasStations}
    />
  );
}

