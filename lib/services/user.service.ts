import { prisma } from "@/lib/prisma";

export class UserService {
  static async findAll() {
    return await prisma.user.findMany({
      include: {
        profile: true,
        gasStations: {
          include: {
            gasStation: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          where: {
            status: "ACTIVE",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  static async findOwners() {
    // Ambil semua Owner (untuk DEVELOPER bisa pilih semua Owner)
    // Untuk display di sidebar, ambil Owner yang memiliki User dengan role OWNER
    const owners = await prisma.owner.findMany({
      include: {
        users: {
          where: {
            role: "OWNER",
          },
          select: {
            id: true,
            email: true,
            displayName: true,
          },
          take: 1, // Ambil user pertama dengan role OWNER
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    return owners.map((owner) => {
      const user = owner.users[0];
      return {
        id: owner.id, // Owner.id untuk Property
        userId: user?.id || "", // User.id untuk edit user (kosong jika tidak ada User OWNER)
        name: user?.displayName || user?.email.split("@")[0] || owner.name || "Unknown",
      };
    });
  }

  static async findById(id: string) {
    return await prisma.user.findUnique({
      where: { id },
      include: {
        profile: true,
        gasStations: {
          include: {
            gasStation: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
  }

  static async findByGasStation(gasStationId: string) {
    return await prisma.user.findMany({
      where: {
        gasStations: {
          some: {
            gasStationId,
            status: "ACTIVE",
          },
        },
      },
      include: {
        profile: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }
}

export type UserWithDetails = Awaited<
  ReturnType<typeof UserService.findAll>
>[number];
export type OwnerForSelect = Awaited<
  ReturnType<typeof UserService.findOwners>
>[number];
