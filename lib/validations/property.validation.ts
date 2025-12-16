import { z } from "zod";

export const createPropertySchema = z.object({
  ownerId: z.string().min(1, "Owner harus dipilih"),
  name: z.string().min(1, "Nama property harus diisi").max(100),
  address: z.string().min(1, "Alamat harus diisi").max(500),
  latitude: z
    .union([z.string(), z.number()])
    .optional()
    .transform((val) => {
      if (val === "" || val === null || val === undefined) return undefined;
      const num = typeof val === "string" ? parseFloat(val) : val;
      return isNaN(num) ? undefined : num;
    })
    .refine((val) => val === undefined || (val >= -90 && val <= 90), {
      message: "Latitude harus antara -90 dan 90",
    }),
  longitude: z
    .union([z.string(), z.number()])
    .optional()
    .transform((val) => {
      if (val === "" || val === null || val === undefined) return undefined;
      const num = typeof val === "string" ? parseFloat(val) : val;
      return isNaN(num) ? undefined : num;
    })
    .refine((val) => val === undefined || (val >= -180 && val <= 180), {
      message: "Longitude harus antara -180 dan 180",
    }),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

export const updatePropertySchema = z.object({
  ownerId: z.string().min(1, "Owner harus dipilih").optional(),
  name: z.string().min(1, "Nama property harus diisi").max(100).optional(),
  address: z.string().min(1, "Alamat harus diisi").max(500).optional(),
  latitude: z
    .union([z.string(), z.number()])
    .optional()
    .transform((val) => {
      if (val === "" || val === null || val === undefined) return undefined;
      const num = typeof val === "string" ? parseFloat(val) : val;
      return isNaN(num) ? undefined : num;
    })
    .refine((val) => val === undefined || (val >= -90 && val <= 90), {
      message: "Latitude harus antara -90 dan 90",
    }),
  longitude: z
    .union([z.string(), z.number()])
    .optional()
    .transform((val) => {
      if (val === "" || val === null || val === undefined) return undefined;
      const num = typeof val === "string" ? parseFloat(val) : val;
      return isNaN(num) ? undefined : num;
    })
    .refine((val) => val === undefined || (val >= -180 && val <= 180), {
      message: "Longitude harus antara -180 dan 180",
    }),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export type CreatePropertyInput = z.infer<typeof createPropertySchema>;
export type UpdatePropertyInput = z.infer<typeof updatePropertySchema>;
