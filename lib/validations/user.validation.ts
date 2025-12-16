import { z } from "zod";

// User validation schema (sesuai schema.prisma)
export const createUserSchema = z.object({
  email: z.string().email("Email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
  role: z.enum(
    ["DEVELOPER", "OWNER", "OWNERGROUP", "STAFF", "FINANCE"],
    {
      message: "Role harus dipilih",
    }
  ),
  ownerId: z.string().optional(),
});

export const updateUserSchema = z.object({
  email: z.string().email("Email tidak valid").optional(),
  password: z.string().min(6, "Password minimal 6 karakter").optional(),
  role: z.enum(
    ["DEVELOPER", "OWNER", "OWNERGROUP", "STAFF", "FINANCE"],
    {
      message: "Role harus dipilih",
    }
  ).optional(),
  ownerId: z.string().optional(),
});

// Profile validation schema
export const createProfileSchema = z.object({
  name: z.string().min(1, "Nama harus diisi").max(100),
  phone: z.string().optional(),
  address: z.string().optional(),
  avatar: z.string().optional(),
});

export const updateProfileSchema = z.object({
  name: z.string().min(1, "Nama harus diisi").max(100).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  avatar: z.string().optional(),
});

// Combined User for creation (with password confirmation)
export const createUserWithProfileSchema = z
  .object({
    // User fields sesuai schema
    email: z.string().email("Email tidak valid"),
    password: z.string().min(6, "Password minimal 6 karakter"),
    confirmPassword: z
      .string()
      .min(6, "Konfirmasi password minimal 6 karakter"),
    roleId: z.enum(
      ["DEVELOPER", "OWNER", "OWNERGROUP", "STAFF", "FINANCE"],
      {
        message: "Role harus dipilih",
      }
    ),
    displayName: z.string().max(100).optional(),
    ownerId: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Password dan konfirmasi password tidak cocok",
    path: ["confirmPassword"],
  });

// Combined User for update (password optional)
export const updateUserWithProfileSchema = z
  .object({
    // User fields sesuai schema
    email: z.string().email("Email tidak valid").optional(),
    password: z
      .union([z.string().min(6, "Password minimal 6 karakter"), z.literal("")])
      .optional()
      .transform((val) => (val === "" ? undefined : val)),
    confirmPassword: z
      .union([
        z.string().min(6, "Konfirmasi password minimal 6 karakter"),
        z.literal(""),
      ])
      .optional()
      .transform((val) => (val === "" ? undefined : val)),
    roleId: z
      .enum(["DEVELOPER", "OWNER", "OWNERGROUP", "STAFF", "FINANCE"])
      .optional(),
    displayName: z.string().max(100).optional(),
    ownerId: z.string().optional(),
  })
  .refine(
    (data) => {
      // If password is provided, confirmPassword must match
      if (data.password && data.password.length > 0) {
        return data.password === data.confirmPassword;
      }
      return true;
    },
    {
      message: "Password dan konfirmasi password tidak cocok",
      path: ["confirmPassword"],
    }
  );

export type CreateUserWithProfileInput = z.infer<
  typeof createUserWithProfileSchema
>;

export type UpdateUserWithProfileInput = z.infer<
  typeof updateUserWithProfileSchema
>;
