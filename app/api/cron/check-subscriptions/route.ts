import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { nowUTC } from "@/lib/utils/datetime";
import { addDays, subDays } from "date-fns";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Vercel mengirim header khusus untuk cron jobs
  // Hanya request dari Vercel cron yang memiliki header ini
  const cronHeader = request.headers.get("x-vercel-cron");
  if (!cronHeader) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = nowUTC();
    const gracePeriodEnd = subDays(now, 3); // 3 hari setelah expire

    // Hanya check SPBU yang PAID atau TRIAL (skip FREE)
    const expiredGasStations = await prisma.gasStation.findMany({
      where: {
        status: "ACTIVE",
        subscriptionType: { in: ["PAID", "TRIAL"] },
        subscriptionEndDate: {
          lte: gracePeriodEnd, // Sudah lewat grace period
        },
      },
      include: {
        owner: {
          include: {
            profile: true,
            administrators: {
              where: {
                role: "ADMINISTRATOR",
              },
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    // Update ke INACTIVE
    if (expiredGasStations.length > 0) {
      await prisma.gasStation.updateMany({
        where: {
          id: { in: expiredGasStations.map((gs) => gs.id) },
        },
        data: {
          status: "INACTIVE",
        },
      });

      // Create notifications untuk owner, ownerGroup, dan admin
      const notifications = await Promise.all(
        expiredGasStations.map(async (gs) => {
          if (!gs.ownerId) return [];

          // Get owner groups untuk owner ini
          const ownerGroups = await prisma.user.findMany({
            where: {
              role: "OWNER_GROUP",
              ownerId: gs.ownerId,
            },
            select: {
              id: true,
            },
          });

          // Get administrators untuk owner ini
          const administrators = gs.owner.administrators || [];

          // Get all developers
          const developers = await prisma.user.findMany({
            where: {
              role: "DEVELOPER",
            },
            select: {
              id: true,
            },
          });

          // Buat notifikasi untuk owner, ownerGroup, admin, dan developer
          const userIds = [
            gs.ownerId, // Owner
            ...ownerGroups.map((og) => og.id), // Owner Groups
            ...administrators.map((admin) => admin.id), // Administrators
            ...developers.map((dev) => dev.id), // Developers
          ];

          const isTrial = gs.isTrial;

          return userIds.map((userId) => ({
            userId,
            type: isTrial ? "TRIAL_EXPIRED" : "SUBSCRIPTION_EXPIRED",
            title: isTrial ? "Trial telah berakhir" : "Subscription Kedaluwarsa",
            message: isTrial
              ? `Trial untuk SPBU ${gs.name} telah kedaluwarsa dan SPBU telah dinonaktifkan. Silakan perpanjang subscription untuk melanjutkan layanan.`
              : `Subscription untuk SPBU ${gs.name} telah kedaluwarsa dan SPBU telah dinonaktifkan.`,
            gasStationId: gs.id,
            isRead: false,
          }));
        })
      );

      const allNotifications = notifications.flat();

      if (allNotifications.length > 0) {
        await prisma.notification.createMany({
          data: allNotifications,
        });
      }
    }

    return NextResponse.json({
      success: true,
      expiredCount: expiredGasStations.length,
      expiredIds: expiredGasStations.map((gs) => gs.id),
    });
  } catch (error) {
    console.error("Error checking subscriptions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
