import { prisma } from "@/lib/prisma";

export class PropertyService {
  static async findAll(includeInactive = false, ownerId?: string | null) {
    return await prisma.property.findMany({
      where: {
        ...(includeInactive ? {} : { status: "ACTIVE" }),
        ...(ownerId ? { ownerId } : {}),
      },
      include: {
        owner: true,
        rooms: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  static async findById(id: string) {
    return await prisma.property.findUnique({
      where: { id },
      include: {
        owner: true,
        rooms: true,
      },
    });
  }
}

export type PropertyWithDetails = Awaited<
  ReturnType<typeof PropertyService.findAll>
>[number];

