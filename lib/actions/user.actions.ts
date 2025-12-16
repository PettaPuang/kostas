"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { checkPermission } from "@/lib/utils/permissions.server";
import { hasPermission } from "@/lib/utils/permissions";
import {
  createUserWithProfileSchema,
  type CreateUserWithProfileInput,
} from "@/lib/validations/user.validation";
import bcrypt from "bcryptjs";

export async function createUser(
  input: CreateUserWithProfileInput,
  gasStationId?: string
) {
  try {
    // 1. Check permission
    const { authorized, user } = await checkPermission([
      "DEVELOPER",
      "ADMINISTRATOR",
    ]);
    if (!authorized || !user) {
      return { success: false, message: "Forbidden" };
    }

    // 2. Validation
    const validated = createUserWithProfileSchema.parse(input);

    // 3. Check if trying to create DEVELOPER or ADMINISTRATOR role
    // Hanya DEVELOPER yang bisa membuat user dengan role DEVELOPER atau ADMINISTRATOR
    if (
      (validated.roleId === "DEVELOPER" ||
        validated.roleId === "ADMINISTRATOR") &&
      !hasPermission(user.roleCode as any, ["DEVELOPER"])
    ) {
      return {
        success: false,
        message:
          "Hanya Developer yang bisa membuat user dengan role Developer atau Administrator",
      };
    }

    // 4. Check jika mencoba membuat OWNER atau DEVELOPER dari gas station
    // OWNER dan DEVELOPER hanya bisa dibuat dari admin panel (tanpa gasStationId)
    if (
      gasStationId &&
      (validated.roleId === "OWNER" || validated.roleId === "DEVELOPER")
    ) {
      return {
        success: false,
        message:
          "Owner dan Developer hanya bisa dibuat dari admin panel",
      };
    }

    // 5. Hash password
    const hashedPassword = await bcrypt.hash(validated.password, 10);

    // 6. Create user
    const newUser = await prisma.user.create({
      data: {
        email: validated.email,
        password: hashedPassword,
        role: validated.roleId as any, // Enum Role
        ...(validated.displayName && { displayName: validated.displayName }),
        ...(validated.ownerId && { ownerId: validated.ownerId }),
      },
    });

    revalidatePath("/admin/users");
    return { success: true, message: "User berhasil dibuat" };
  } catch (error) {
    console.error("Create user error:", error);
    if (error instanceof Error) {
      return { success: false, message: error.message };
    }
    return { success: false, message: "Gagal membuat user" };
  }
}

export async function updateUser(
  userId: string,
  input: Partial<CreateUserWithProfileInput>
) {
  try {
    // 1. Get current user (semua authenticated user bisa akses)
    const { authorized, user } = await checkPermission([
      "DEVELOPER",
      "ADMINISTRATOR",
      "OWNER",
      "MANAGER",
      "OPERATOR",
      "UNLOADER",
      "FINANCE",
      "ACCOUNTING",
    ]);
    if (!user) {
      return { success: false, message: "Unauthorized" };
    }

    // 2. Check if user can update (semua bisa update sendiri, atau DEVELOPER/ADMINISTRATOR bisa update semua)
    const canUpdate =
      user.id === userId ||
      hasPermission(user.roleCode as any, ["DEVELOPER", "ADMINISTRATOR"]);

    if (!canUpdate) {
      return { success: false, message: "Forbidden" };
    }

    // 3. Check if trying to change role (hanya DEVELOPER/ADMINISTRATOR yang bisa)
    if (
      input.roleId &&
      !hasPermission(user.roleCode as any, ["DEVELOPER", "ADMINISTRATOR"])
    ) {
      return { success: false, message: "Tidak dapat mengubah role" };
    }

    // 4. Check if trying to change role to DEVELOPER or ADMINISTRATOR
    // Hanya DEVELOPER yang bisa mengubah role menjadi DEVELOPER atau ADMINISTRATOR
    if (
      input.roleId &&
      (input.roleId === "DEVELOPER" || input.roleId === "ADMINISTRATOR") &&
      !hasPermission(user.roleCode as any, ["DEVELOPER"])
    ) {
      return {
        success: false,
        message:
          "Hanya Developer yang bisa mengubah role menjadi Developer atau Administrator",
      };
    }

    // 5. Get existing user
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      return { success: false, message: "User tidak ditemukan" };
    }

    // 6. Update user
    const updateData: any = {
      ...(input.email && { email: input.email }),
      ...(input.roleId && { role: input.roleId as any }), // Enum Role
      ...(input.displayName !== undefined && { displayName: input.displayName || null }),
      ...(input.ownerId !== undefined && { ownerId: input.ownerId || null }),
    };

    // Hash password if provided
    if (input.password) {
      updateData.password = await bcrypt.hash(input.password, 10);
    }

    await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    revalidatePath("/admin/users");
    return { success: true, message: "User berhasil diupdate" };
  } catch (error) {
    console.error("Update user error:", error);
    if (error instanceof Error) {
      return { success: false, message: error.message };
    }
    return { success: false, message: "Gagal mengupdate user" };
  }
}

export async function getUserById(userId: string) {
  try {
    const { authorized } = await checkPermission([
      "DEVELOPER",
      "ADMINISTRATOR",
      "OWNER",
    ]);
    if (!authorized) {
      return { success: false, message: "Forbidden", data: null };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        displayName: true,
        ownerId: true,
      },
    });

    if (!user) {
      return { success: false, message: "User not found", data: null };
    }

    return {
      success: true,
      message: "User found",
      data: {
        id: user.id,
        email: user.email,
        role: user.role,
        displayName: user.displayName,
        ownerId: user.ownerId,
      },
    };
  } catch (error) {
    console.error("Get user error:", error);
    if (error instanceof Error) {
      return { success: false, message: error.message, data: null };
    }
    return { success: false, message: "Gagal mengambil data user", data: null };
  }
}

export async function deleteUser(userId: string) {
  try {
    // 1. Check permission
    const { authorized, user } = await checkPermission([
      "DEVELOPER",
      "ADMINISTRATOR",
    ]);
    if (!authorized || !user) {
      return { success: false, message: "Forbidden" };
    }

    // 2. Delete user (profile will be cascade deleted if set in schema)
    await prisma.user.delete({
      where: { id: userId },
    });

    revalidatePath("/admin/users");
    return { success: true, message: "User berhasil dihapus" };
  } catch (error) {
    console.error("Delete user error:", error);
    if (error instanceof Error) {
      return { success: false, message: error.message };
    }
    return { success: false, message: "Gagal menghapus user" };
  }
}

export async function assignUserToGasStation(
  userId: string,
  gasStationId: string
) {
  try {
    // 1. Check permission
    const { authorized, user } = await checkPermission([
      "DEVELOPER",
      "ADMINISTRATOR",
    ]);
    if (!authorized || !user) {
      return { success: false, message: "Forbidden" };
    }

    // 2. Check if already assigned
    const existing = await prisma.userGasStation.findFirst({
      where: {
        userId,
        gasStationId,
        status: "ACTIVE",
      },
    });

    if (existing) {
      return { success: false, message: "User sudah assigned ke SPBU ini" };
    }

    // 3. Create assignment
    await prisma.userGasStation.create({
      data: {
        userId,
        gasStationId,
        status: "ACTIVE",
        createdById: user.id,
      },
    });

    revalidatePath(`/admin/gas-stations/${gasStationId}`);
    revalidatePath("/admin/users");
    return { success: true, message: "User berhasil di-assign" };
  } catch (error) {
    console.error("Assign user error:", error);
    if (error instanceof Error) {
      return { success: false, message: error.message };
    }
    return { success: false, message: "Gagal assign user" };
  }
}

export async function unassignUserFromGasStation(
  userId: string,
  gasStationId: string
) {
  try {
    // 1. Check permission
    const { authorized, user } = await checkPermission([
      "DEVELOPER",
      "ADMINISTRATOR",
    ]);
    if (!authorized || !user) {
      return { success: false, message: "Forbidden" };
    }

    // 2. Update status to INACTIVE
    await prisma.userGasStation.updateMany({
      where: {
        userId,
        gasStationId,
        status: "ACTIVE",
      },
      data: {
        status: "INACTIVE",
      },
    });

    revalidatePath(`/admin/gas-stations/${gasStationId}`);
    revalidatePath("/admin/users");
    return { success: true, message: "User berhasil di-unassign" };
  } catch (error) {
    console.error("Unassign user error:", error);
    if (error instanceof Error) {
      return { success: false, message: error.message };
    }
    return { success: false, message: "Gagal unassign user" };
  }
}
