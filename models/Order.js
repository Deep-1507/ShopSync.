import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    billNumber: {
      type: String,
      required: [true, "Bill number is required"],
      unique: true,
      trim: true,
      uppercase: true,
    },
    orderType: {
      type: String,
      required: [true, "Order type is required"],
      enum: {
        values: ["Collect from store", "Local Delivery", "Global Delivery"],
        message: "Category must be Collect from store, Local Delivery or Global Delivery"
      },
      trim: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Customer ID is required"],
    },

    enterpriseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Enterprise",
      required: [true, "Enterprise ID is required"],
    },

    products: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: [true, "Product ID is required"],
        },

        quantity: {
          type: Number,
          required: [true, "Quantity is required"],
          min: [0.001, "Quantity must be greater than zero"],
        },

        unitPrice: {
          type: Number,
          required: [true, "Unit price is required"],
          min: [0, "Unit price cannot be negative"],
        },

        discount: {
          type: Number,
          default: 0,
          min: [0, "Discount cannot be negative"],
        },

        taxRate: {
          type: Number,
          default: 0,
          min: [0, "Tax rate cannot be negative"],
          max: [100, "Tax rate cannot exceed 100%"],
        },

        lineTotal: {
          type: Number,
          required: [true, "Line total is required"],
          min: [0, "Line total cannot be negative"],
        },
      },
    ],

    subtotal: {
      type: Number,
      required: [true, "Subtotal is required"],
      min: [0, "Subtotal cannot be negative"],
    },

    totalDiscount: {
      type: Number,
      default: 0,
      min: [0, "Total discount cannot be negative"],
    },

    totalTax: {
      type: Number,
      default: 0,
      min: [0, "Total tax cannot be negative"],
    },

    shippingCharges: {
      type: Number,
      default: 0,
      min: [0, "Shipping charges cannot be negative"],
    },

    grandTotal: {
      type: Number,
      required: [true, "Grand total is required"],
      min: [0, "Grand total cannot be negative"],
    },

    amountPaid: {
      type: Number,
      default: 0,
      min: [0, "Amount paid cannot be negative"],
    },

    balanceDue: {
      type: Number,
      default: 0,
      min: [0, "Balance due cannot be negative"],
    },

    paymentType: {
      type: String,
      enum: ["prepaid", "cash_on_takeaway", "cash_on_delivery"],
      default: "cash_on_takeaway",
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "partially_paid", "paid", "failed", "refunded"],
      default: "pending",
    },

    payments: [
      {
        method: {
          type: String,
          enum: [
            "cash",
            "upi",
            "card",
            "net_banking",
            "bank_transfer",
            "wallet",
            "cheque",
            "cash_on_delivery",
            "other",
          ],
          required: true,
        },

        amount: {
          type: Number,
          required: true,
          min: [0, "Payment amount cannot be negative"],
        },

        transactionId: {
          type: String,
          trim: true,
          default: "",
        },

        status: {
          type: String,
          enum: ["pending", "successful", "failed", "refunded"],
          default: "pending",
        },

        paidAt: {
          type: Date,
          default: null,
        },
      },
    ],

    orderStatus: {
      type: String,
      enum: [
        "placed",
        "confirmed",
        "processing",
        "completed",
        "cancelled",
      ],
      default: "placed",
    },

    billingAddress: {
      type: String,
      trim: true,
      default: "",
    },

    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
    otp: {
      type: String,
      trim: true,
      default: "",
    },

    billDate: {
      type: Date,
      default: Date.now,
    },

    dueDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const Order =
  mongoose.models.Order || mongoose.model("Order", orderSchema);

export default Order;