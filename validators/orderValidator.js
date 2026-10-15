
import { z } from "zod";

const objectIdSchema = z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid MongoDB ObjectId");

const paymentMethodSchema = z.enum([
    "cash",
    "upi",
    "card",
    "net_banking",
    "bank_transfer",
    "wallet",
    "cheque",
    "cash_on_delivery",
    "other",
]);

export const orderSchemaValidator = z
    .object({
        billNumber: z
            .string()
            .trim()
            .min(1, "Bill number is required")
            .max(50)
            .transform((value) => value.toUpperCase()),

        orderType: z
            .enum(["Collect from store", "Local Delivery", "Global Delivery"], {
                message: "Category must be Collect from store, Local Delivery, Global Delivery",
            }),

        customerId: objectIdSchema,

        enterpriseId: objectIdSchema,

        products: z
            .array(
                z
                    .object({
                        productId: objectIdSchema,

                        quantity: z
                            .number()
                            .finite()
                            .positive("Quantity must be greater than zero"),

                        unitPrice: z
                            .number()
                            .finite()
                            .min(0, "Unit price cannot be negative"),

                        discount: z
                            .number()
                            .finite()
                            .min(0)
                            .default(0),

                        taxRate: z
                            .number()
                            .finite()
                            .min(0)
                            .max(100)
                            .default(0),

                        lineTotal: z
                            .number()
                            .finite()
                            .min(0, "Line total cannot be negative"),
                    })
                    .strict()
            )
            .min(1, "At least one product is required"),

        subtotal: z.number().finite().min(0),

        totalDiscount: z.number().finite().min(0).default(0),

        totalTax: z.number().finite().min(0).default(0),

        shippingCharges: z.number().finite().min(0).default(0),

        grandTotal: z.number().finite().min(0),

        amountPaid: z.number().finite().min(0).default(0),

        balanceDue: z.number().finite().min(0).default(0),

        paymentType: z
            .enum(["prepaid", "postpaid", "cash_on_delivery"])
            .default("prepaid"),

        paymentStatus: z
            .enum([
                "pending",
                "partially_paid",
                "paid",
                "failed",
                "refunded",
            ])
            .default("pending"),

        payments: z
            .array(
                z
                    .object({
                        method: paymentMethodSchema,

                        amount: z.number().finite().min(0),

                        transactionId: z.string().trim().max(200).default(""),

                        status: z
                            .enum(["pending", "successful", "failed", "refunded"])
                            .default("pending"),

                        paidAt: z.coerce.date().nullable().default(null),
                    })
                    .strict()
            )
            .default([]),

        orderStatus: z
            .enum([
                "placed",
                "confirmed",
                "processing",
                "completed",
                "cancelled",
            ])
            .default("placed"),

        billingAddress: z.string().trim().max(500).default(""),

        notes: z.string().trim().max(1000).default(""),

        billDate: z.coerce.date().default(() => new Date()),

        dueDate: z.coerce.date().nullable().default(null),
    })
    .strict();