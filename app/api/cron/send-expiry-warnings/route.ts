import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { nowUTC, addDaysUTC } from "@/lib/utils/datetime";
import { addDays, differenceInDays, isBefore } from "date-fns";

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
    const warningDays = [7, 3, 1]; // Warning 7 hari, 3 hari, dan 1 hari sebelum expire

    // Cari SPBU yang akan expire dalam 0-7 hari ke depan (0 = hari ini)
    // Gunakan range yang lebih luas untuk memastikan tidak ada yang terlewat
    const expiringGasStations = await prisma.gasStation.findMany({
      where: {
        status: "ACTIVE",
        subscriptionType: { in: ["PAID", "TRIAL"] },
        subscriptionEndDate: {
          gte: now, // Mulai dari hari ini
          lte: addDays(now, 7), // Sampai 7 hari ke depan
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

    // Create notifications hanya untuk yang akan expire dalam 7, 3, atau 1 hari
    // Gunakan Math.ceil untuk memastikan perhitungan hari lebih akurat
    const filteredGasStations = expiringGasStations.filter((gs) => {
      if (!gs.subscriptionEndDate) return false;
      const endDate = new Date(gs.subscriptionEndDate);
      // Set waktu ke tengah hari untuk perhitungan yang lebih akurat
      const endDateMidnight = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
      const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const daysLeft = Math.ceil((endDateMidnight.getTime() - nowMidnight.getTime()) / (1000 * 60 * 60 * 24));
      return warningDays.includes(daysLeft);
    });

    // Process each gas station to get all related users
    const notificationsPromises = filteredGasStations.map(async (gs) => {
      if (!gs.ownerId || !gs.subscriptionEndDate) return [];

      // Hitung daysLeft dengan cara yang sama seperti filter
      const endDate = new Date(gs.subscriptionEndDate);
      const endDateMidnight = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
      const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const daysLeft = Math.ceil((endDateMidnight.getTime() - nowMidnight.getTime()) / (1000 * 60 * 60 * 24));
      const isTrial = gs.isTrial;

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

      return userIds.map((userId) => ({
        userId,
        type: "SUBSCRIPTION_EXPIRY_WARNING",
        title: isTrial
          ? `Trial akan berakhir dalam ${daysLeft} hari`
          : `Subscription akan berakhir dalam ${daysLeft} hari`,
        message: isTrial
          ? `Trial untuk SPBU ${gs.name} akan berakhir dalam ${daysLeft} hari. Silakan perpanjang subscription untuk melanjutkan layanan.`
          : `Subscription untuk SPBU ${gs.name} akan berakhir dalam ${daysLeft} hari. Silakan perpanjang subscription untuk melanjutkan layanan.`,
        gasStationId: gs.id,
        isRead: false,
      }));
    });

    // Flatten async results
    const allNotifications = (await Promise.all(notificationsPromises)).flat();

    if (allNotifications.length > 0) {
      // Check jika sudah ada notification yang sama hari ini
      const today = nowUTC();
      today.setHours(0, 0, 0, 0);
      const tomorrow = addDays(today, 1);

      const existingNotifications = await prisma.notification.findMany({
        where: {
          type: "SUBSCRIPTION_EXPIRY_WARNING",
          createdAt: {
            gte: today,
            lt: tomorrow,
          },
          gasStationId: { in: allNotifications.map((n) => n.gasStationId!).filter(Boolean) },
        },
        select: {
          gasStationId: true,
          userId: true,
        },
      });

      const existingKeys = new Set(
        existingNotifications.map(
          (n) => `${n.userId}-${n.gasStationId}`
        )
      );

      const newNotifications = allNotifications.filter(
        (n) => !existingKeys.has(`${n.userId}-${n.gasStationId}`)
      );

      if (newNotifications.length > 0) {
        await prisma.notification.createMany({
          data: newNotifications,
        });
      }
    }

    // Tambahkan notifikasi untuk yang sudah expired atau dalam grace period
    const expiredGasStations = await prisma.gasStation.findMany({
      where: {
        status: "ACTIVE",
        subscriptionType: { in: ["PAID", "TRIAL"] },
        subscriptionEndDate: {
          lte: now, // Sudah expired
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

    // Filter yang masih dalam grace period (expired tapi belum lewat 3 hari)
    const gracePeriodNotificationsPromises = expiredGasStations.map(async (gs) => {
      if (!gs.ownerId || !gs.subscriptionEndDate) return [];
      
      const endDate = new Date(gs.subscriptionEndDate);
      const gracePeriodEnd = addDays(endDate, 3);
      const isTrial = gs.isTrial;
      
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

      // Hanya yang masih dalam grace period (belum lewat 3 hari)
      if (!isBefore(gracePeriodEnd, now)) {
        return userIds.map((userId) => ({
          userId,
          type: "SUBSCRIPTION_EXPIRED_GRACE_PERIOD",
          title: isTrial
            ? "Trial telah berakhir - Masa Tenggang"
            : "Subscription telah berakhir - Masa Tenggang",
          message: isTrial
            ? `Trial untuk SPBU ${gs.name} telah berakhir. Anda masih dalam masa tenggang 3 hari. Silakan perpanjang subscription sebelum masa tenggang berakhir.`
            : `Subscription untuk SPBU ${gs.name} telah berakhir. Anda masih dalam masa tenggang 3 hari. Silakan perpanjang subscription sebelum masa tenggang berakhir.`,
          gasStationId: gs.id,
          isRead: false,
        }));
      }
      
      // Untuk trial yang sudah lewat grace period, buat notifikasi khusus
      if (isTrial && isBefore(gracePeriodEnd, now)) {
        return userIds.map((userId) => ({
          userId,
          type: "TRIAL_EXPIRED",
          title: "Trial telah berakhir",
          message: `Trial untuk SPBU ${gs.name} telah berakhir dan masa tenggang telah habis. SPBU akan dinonaktifkan. Silakan perpanjang subscription untuk melanjutkan layanan.`,
          gasStationId: gs.id,
          isRead: false,
        }));
      }
      
      return [];
    });

    const gracePeriodNotifications = (await Promise.all(gracePeriodNotificationsPromises)).flat();

    if (gracePeriodNotifications.length > 0) {
      // Check jika sudah ada notification yang sama hari ini
      const today = nowUTC();
      today.setHours(0, 0, 0, 0);
      const tomorrow = addDays(today, 1);

      // Check untuk semua type: SUBSCRIPTION_EXPIRED_GRACE_PERIOD dan TRIAL_EXPIRED
      const existingGraceNotifications = await prisma.notification.findMany({
        where: {
          type: { in: ["SUBSCRIPTION_EXPIRED_GRACE_PERIOD", "TRIAL_EXPIRED"] },
          createdAt: {
            gte: today,
            lt: tomorrow,
          },
          gasStationId: { in: gracePeriodNotifications.map((n) => n.gasStationId!).filter(Boolean) },
        },
        select: {
          gasStationId: true,
          userId: true,
          type: true,
        },
      });

      // Check berdasarkan userId, gasStationId, dan type
      const existingGraceKeys = new Set(
        existingGraceNotifications.map(
          (n) => `${n.userId}-${n.gasStationId}-${n.type}`
        )
      );

      const newGraceNotifications = gracePeriodNotifications.filter(
        (n) => !existingGraceKeys.has(`${n.userId}-${n.gasStationId}-${n.type}`)
      );

      if (newGraceNotifications.length > 0) {
        await prisma.notification.createMany({
          data: newGraceNotifications,
        });
      }
    }

    // Pisahkan grace period dan trial expired notifications
    const gracePeriodCount = gracePeriodNotifications.filter(
      (n) => n.type === "SUBSCRIPTION_EXPIRED_GRACE_PERIOD"
    ).length;
    const trialExpiredCount = gracePeriodNotifications.filter(
      (n) => n.type === "TRIAL_EXPIRED"
    ).length;

    return NextResponse.json({
      success: true,
      warningCount: allNotifications.length,
      gracePeriodCount,
      trialExpiredCount,
    });
  } catch (error) {
    console.error("Error sending expiry warnings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

