import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    enterpriseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Enterprise",
      required: [true, "Enterprise ID is required"],
      index: true,
    },

    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      minlength: [1, "Product name is required"],
      maxlength: [120, "Product name cannot exceed 120 characters"],
    },

    photo_url: {
      type: String,
      trim: true,
      maxlength: [1200, "Photo URL cannot exceed 1200 characters"],
      default: "",
    },

    sku: {
      type: String,
      required: [true, "SKU is required"],
      trim: true,
      uppercase: true,
      minlength: [1, "SKU is required"],
    },

    category: {
      type: String,
      required: [true, "Category is required"],
      trim: true,
      minlength: [1, "Category is required"],
    },

    brand: {
      type: String,
      trim: true,
      default: "",
    },

    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },

    stock: {
      type: Number,
      min: [0, "Stock cannot be negative"],
      default: 0,
    },

    unit: {
      type: String,
      required: [true, "Unit is required"],
      trim: true,
      minlength: [1, "Unit is required"],
    },

    weight: {
      type: Number,
      min: [0, "Weight cannot be negative"],
      default: 0,
    },

    description: {
      type: String,
      trim: true,
      maxlength: [
        1000,
        "Description cannot exceed 1000 characters",
      ],
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate SKUs.
productSchema.index({ sku: 1 }, { unique: true });

const Product =
  mongoose.models.Product ||
  mongoose.model("Product", productSchema);

export default Product;