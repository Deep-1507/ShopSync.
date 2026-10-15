import { z } from "zod";

const productFields = {
  name: z.string().trim().min(1, "Product name is required").max(120),
  photo_url: z.string().trim().max(1200).optional().or(z.literal("")),
  sku: z.string().trim().min(1, "SKU is required").transform((value) => value.toUpperCase()),
  category: z.string().trim().min(1, "Category is required"),
  brand: z.string().trim().optional().default(""),
  price: z.number().min(0, "Price cannot be negative"),
  stock: z.number().min(0, "Stock cannot be negative").default(0),
  unit: z.string().trim().min(1, "Unit is required"),
  weight: z.number().min(0, "Weight cannot be negative").default(0),
  description: z.string().trim().max(1000).optional().default(""),
};

export const productSchemaValidator = z.object({
  name: productFields.name,
  photo_url: productFields.photo_url,
  sku: productFields.sku,
  category: productFields.category,
  brand: productFields.brand,
  price: productFields.price,
  stock: productFields.stock,
  unit: productFields.unit,
  weight: productFields.weight,
  description: productFields.description,
});

export const productUpdateSchemaValidator = z
  .object({
    name: productFields.name.optional(),
    photo_url: productFields.photo_url,
    sku: productFields.sku.optional(),
    category: productFields.category.optional(),
    brand: productFields.brand.optional(),
    price: productFields.price.optional(),
    stock: productFields.stock.optional(),
    unit: productFields.unit.optional(),
    weight: productFields.weight.optional(),
    description: productFields.description.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required to update a product",
  });