import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique:true,
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

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 8,
      select: false,
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
  },
  {
    timestamps: true,
  }
);

const User =
  mongoose.models.User || mongoose.model("User", userSchema);

export default User;