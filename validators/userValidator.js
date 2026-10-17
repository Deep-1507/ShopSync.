
import { z } from "zod";

const locationSchema = z.object({
  addressLine: z.string().trim().min(1, "Address line is required"),
  district: z.string().trim().min(1, "District is required"),
  state: z.string().trim().min(1, "State is required"),
  pinCode: z.string().trim().min(1, "PIN code is required"),
  landmark: z.string().trim().default(""),
});

export const signupValidator = z
  .object({
    email: z.string().trim().email().max(120).transform(
      (value) => value.toLowerCase()
    ),

    phone: z.string().trim().min(1).max(15),

    name: z.string().trim().min(1).max(100),

    password: z.string().min(8).max(72),

    location: locationSchema,

    latitude: z.number().finite().min(-90).max(90),

    longitude: z.number().finite().min(-180).max(180),
  })
  .strict();

export const signinValidator = z
  .object({
    email: z.string().trim().email().transform(
      (value) => value.toLowerCase()
    ),
    password: z.string().min(1),
  })
  .strict();

export const updateUserValidator = z
  .object({
    email: z
      .string()
      .trim()
      .email()
      .max(120)
      .transform((value) => value.toLowerCase())
      .optional(),

    phone: z
      .string()
      .trim()
      .min(1)
      .max(15)
      .optional(),

    name: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .optional(),

    location: locationSchema.partial().optional(),

    latitude: z
      .number()
      .finite()
      .min(-90)
      .max(90)
      .optional(),

    longitude: z
      .number()
      .finite()
      .min(-180)
      .max(180)
      .optional(),

    // Blank means do not change the existing password.
    password: z
      .string()
      .max(128)
      .refine(
        (value) => value.trim() === "" || value.length >= 8,
        {
          message: "Password must be at least 8 characters",
        }
      )
      .optional(),
  })
  .strict()
  .refine(
    (data) =>
      Object.keys(data).some(
        (key) => key !== "password" || data.password?.trim() !== ""
      ),
    {
      message: "At least one field must be provided",
    }
  );