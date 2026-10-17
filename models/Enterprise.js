import mongoose from "mongoose";

const enterpriseSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: 120,
    },

    phone: {
      type: String,
      required: [true, "Phone number is required"],
      unique: true,
      trim: true,
    },

    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: 100,
    },

    enterpriseName: {
      type: String,
      required: [true, "Enterprise name is required"],
      trim: true,
      maxlength: 100,
    },

    category: {
      type: String,
      required: [true, "Category is required"],
      enum: {
        values: ["type1", "type2", "type3"],
        message: "Category must be type1, type2, or type3",
      },
      trim: true,
    },

    location: {
      addressLine: {
        type: String,
        required: [true, "Address line is required"],
        trim: true,
      },
      district: {
        type: String,
        required: [true, "District is required"],
        trim: true,
      },
      state: {
        type: String,
        required: [true, "State is required"],
        trim: true,
      },
      pinCode: {
        type: String,
        required: [true, "PIN code is required"],
        trim: true,
      },
      landmark: {
        type: String,
        trim: true,
        default: "",
      },
    },

    latitude: {
      type: Number,
      required: [true, "Latitude is required"],
      min: -90,
      max: 90,
    },

    longitude: {
      type: Number,
      required: [true, "Longitude is required"],
      min: -180,
      max: 180,
    },

    paymentTypes: {
      type: [
        {
          type: String,
          enum: {
            values: [
              "prepaid_online",
              "cash_on_takeaway",
              "cash_on_delivery",
            ],
            message:
              "Payment type must be prepaid_online, cash_on_takeaway, or cash_on_delivery",
          },
        },
      ],
      default: [
        "prepaid_online",
        "cash_on_takeaway",
        "cash_on_delivery",
      ],
    },

    isAcceptingOnlineOrders: {
      type: Boolean,
      default: true,
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 8,
      select: false,
    },
  },
  { timestamps: true }
);

const Enterprise =
  mongoose.models.Enterprise ||
  mongoose.model("Enterprise", enterpriseSchema);

export default Enterprise;