import { z } from "zod";

const categorySchema = z.enum(["type1", "type2", "type3"]);

const paymentTypeSchema = z.enum(["Online", "COD", "COT"]);

const locationSchema = z.object({
  addressLine: z.string().trim().min(1, "Address line is required"),
  district: z.string().trim().min(1, "District is required"),
  state: z.string().trim().min(1, "State is required"),
  pinCode: z.string().trim().min(1, "PIN code is required"),
  landmark: z.string().trim().default(""),
});

export const enterpriseSignupValidator = z.object({
  email: z
    .string()
    .trim()
    .email()
    .max(120)
    .transform((v) => v.toLowerCase()),

  phone: z.string().trim().min(7).max(20),

  name: z.string().trim().min(1).max(100),

  enterpriseName: z.string().trim().min(1).max(100),

  category: categorySchema,

  location: locationSchema,

  latitude: z.coerce.number().min(-90).max(90),

  longitude: z.coerce.number().min(-180).max(180),

  paymentTypes: z
    .array(paymentTypeSchema)
    .default(["Online", "COD", "COT"]),

  isAcceptingOnlineOrders: z.boolean().default(true),

  password: z.string().min(8).max(72),
});

export const enterpriseSigninValidator = z.object({
  email: z
    .string()
    .trim()
    .email()
    .transform((v) => v.toLowerCase()),

  password: z.string().min(1).max(72),
});

export const enterpriseUpdateValidator = z
  .object({
    email: z
      .string()
      .trim()
      .email()
      .max(120)
      .transform((v) => v.toLowerCase())
      .optional(),

    phone: z.string().trim().min(7).max(20).optional(),

    name: z.string().trim().min(1).max(100).optional(),

    enterpriseName: z.string().trim().min(1).max(100).optional(),

    category: categorySchema.optional(),

    location: locationSchema.partial().optional(),

    latitude: z.coerce.number().min(-90).max(90).optional(),

    longitude: z.coerce.number().min(-180).max(180).optional(),

    paymentTypes: z.array(paymentTypeSchema).optional(),

    isAcceptingOnlineOrders: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required for update",
  });