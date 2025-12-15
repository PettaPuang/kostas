"use server";

import { signIn, signOut } from "@/auth";
import { AuthError } from "next-auth";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type AuthActionState = {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
};

export async function loginAction(
  prevState: AuthActionState | undefined,
  formData: FormData
): Promise<AuthActionState> {
  try {
    const rawData = {
      email: formData.get("email"),
      password: formData.get("password"),
    };

    const validated = loginSchema.parse(rawData);

    await signIn("credentials", {
      email: validated.email,
      password: validated.password,
      redirect: false,
    });

    return {
      success: true,
      message: "Login successful",
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        message: "Validation failed",
        errors: error.flatten().fieldErrors,
      };
    }

    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return {
            success: false,
            message: "Invalid email or password",
          };
        default:
          return {
            success: false,
            message: "Authentication error",
          };
      }
    }

    return {
      success: false,
      message: "An unexpected error occurred",
    };
  }
}

export async function registerAction(
  prevState: AuthActionState | undefined,
  formData: FormData
): Promise<AuthActionState> {
  try {
    const rawData = {
      email: formData.get("email"),
      password: formData.get("password"),
    };

    const validated = registerSchema.parse(rawData);

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: {
        email: validated.email,
      },
    });

    if (existingUser) {
      return {
        success: false,
        message: "Email already exists",
      };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validated.password, 10);

    // Create user
    await prisma.user.create({
      data: {
        email: validated.email,
        password: hashedPassword,
        role: "STAFF", // Default role untuk user baru
      },
    });

    // Auto login after registration
    await signIn("credentials", {
      email: validated.email,
      password: validated.password,
      redirect: false,
    });

    return {
      success: true,
      message: "Registration successful",
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        message: "Validation failed",
        errors: error.flatten().fieldErrors,
      };
    }

    return {
      success: false,
      message: "Registration failed. Please try again.",
    };
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
