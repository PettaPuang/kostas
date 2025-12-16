"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { checkPermission } from "@/lib/utils/permissions.server";
import {
  createPropertySchema,
  updatePropertySchema,
  type CreatePropertyInput,
  type UpdatePropertyInput,
} from "@/lib/validations/property.validation";

export async function createProperty(input: CreatePropertyInput) {
  try {
    const { authorized } = await checkPermission([
      "DEVELOPER",
      "OWNER",
      "OWNER_GROUP",
    ]);
    if (!authorized) {
      return { success: false, message: "Forbidden" };
    }

    const validated = createPropertySchema.parse(input);

    const newProperty = await prisma.property.create({
      data: {
        ownerId: validated.ownerId,
        name: validated.name,
        address: validated.address,
        latitude: validated.latitude,
        longitude: validated.longitude,
        status: validated.status,
      },
    });

    revalidatePath("/welcome");
    return { success: true, message: "Property berhasil dibuat" };
  } catch (error) {
    console.error("Create property error:", error);
    if (error instanceof Error) {
      return { success: false, message: error.message };
    }
    return { success: false, message: "Gagal membuat property" };
  }
}

export async function updateProperty(
  propertyId: string,
  input: UpdatePropertyInput
) {
  try {
    const { authorized } = await checkPermission([
      "DEVELOPER",
      "OWNER",
      "OWNER_GROUP",
    ]);
    if (!authorized) {
      return { success: false, message: "Forbidden" };
    }

    const validated = updatePropertySchema.parse(input);

    await prisma.property.update({
      where: { id: propertyId },
      data: {
        ...(validated.ownerId && { ownerId: validated.ownerId }),
        ...(validated.name && { name: validated.name }),
        ...(validated.address && { address: validated.address }),
        ...(validated.latitude !== undefined && {
          latitude: validated.latitude,
        }),
        ...(validated.longitude !== undefined && {
          longitude: validated.longitude,
        }),
        ...(validated.status && { status: validated.status }),
      },
    });

    revalidatePath("/welcome");
    return { success: true, message: "Property berhasil diupdate" };
  } catch (error) {
    console.error("Update property error:", error);
    if (error instanceof Error) {
      return { success: false, message: error.message };
    }
    return { success: false, message: "Gagal mengupdate property" };
  }
}

export async function getPropertyById(propertyId: string) {
  try {
    const { authorized } = await checkPermission([
      "DEVELOPER",
      "OWNER",
      "OWNER_GROUP",
    ]);
    if (!authorized) {
      return { success: false, message: "Forbidden", data: null };
    }

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: {
        id: true,
        ownerId: true,
        name: true,
        address: true,
        latitude: true,
        longitude: true,
        status: true,
      },
    });

    if (!property) {
      return { success: false, message: "Property not found", data: null };
    }

    return {
      success: true,
      message: "Property found",
      data: {
        id: property.id,
        ownerId: property.ownerId,
        name: property.name,
        address: property.address,
        latitude: property.latitude,
        longitude: property.longitude,
        status: property.status,
      },
    };
  } catch (error) {
    console.error("Get property error:", error);
    if (error instanceof Error) {
      return { success: false, message: error.message, data: null };
    }
    return {
      success: false,
      message: "Gagal mengambil data property",
      data: null,
    };
  }
}
