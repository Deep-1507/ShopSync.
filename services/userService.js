import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/User";
import {connectDB} from "../lib/mongodb";
import {
  signupValidator,
  signinValidator,
  updateUserValidator,
} from "../validators/userValidator";

export async function registerUser(body) {
  await connectDB();
 
  const data = signupValidator.parse(body);
 console.log("we are here")
  const existingUser = await User.findOne({
    $or: [{ email: data.email }, { phone: data.phone }],
  });

  if (existingUser) {
    const error = new Error(
      existingUser.email === data.email
        ? "Email already registered"
        : "Phone number already registered"
    );
    error.statusCode = 409;
    throw error;
  }

  const hashedPassword = await bcrypt.hash(data.password, 12);

  const user = await User.create({
    ...data,
    password: hashedPassword,
  });

  return user;
}

export async function authenticateUser(body) {
  await connectDB();

  const data = signinValidator.parse(body);

  const user = await User.findOne({ email: data.email }).select(
    "+password"
  );

  if (!user) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  const passwordMatches = await bcrypt.compare(
    data.password,
    user.password
  );

  if (!passwordMatches) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  return user;
}

export async function getUserById(userId) {
  await connectDB();

  if (!mongoose.isValidObjectId(userId)) {
    return null;
  }

  return User.findById(userId);
}

export async function getUserByEmail(email) {
  await connectDB();

  if (typeof email !== "string" || !email.trim()) {
    return null;
  }

  return User.findOne({
    email: email.trim().toLowerCase(),
  });
}

export async function updateUser(userId, body) {
  await connectDB();

  if (!mongoose.isValidObjectId(userId)) {
    const error = new Error("Invalid user ID");
    error.statusCode = 400;
    throw error;
  }

  const data = updateUserValidator.parse(body);

  // Empty password means keep the existing password.
  if (data.password === "") {
    delete data.password;
  } else if (data.password) {
    data.password = await bcrypt.hash(data.password, 12);
  }

  if (Object.keys(data).length === 0) {
    const error = new Error("At least one field must be provided");
    error.statusCode = 400;
    throw error;
  }

  const duplicateConditions = [];

  if (data.email) {
    duplicateConditions.push({ email: data.email });
  }

  if (data.phone) {
    duplicateConditions.push({ phone: data.phone });
  }

  if (duplicateConditions.length > 0) {
    const existingUser = await User.findOne({
      _id: { $ne: userId },
      $or: duplicateConditions,
    });

    if (existingUser) {
      const error = new Error(
        data.email && existingUser.email === data.email
          ? "Email already registered"
          : "Phone number already registered"
      );

      error.statusCode = 409;
      throw error;
    }
  }

  try {
    const user = await User.findById(userId);

    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    // Update only the fields provided by the request.
    Object.assign(user, data);

    await user.save();

    // Never return the password hash.
    const updatedUser = await User.findById(userId).select("-password");

    return updatedUser;
  } catch (error) {
    if (error.code === 11000) {
      const duplicateField = Object.keys(error.keyPattern ?? {})[0];

      const duplicateError = new Error(
        duplicateField === "email"
          ? "Email already registered"
          : "Phone number already registered"
      );

      duplicateError.statusCode = 409;
      throw duplicateError;
    }

    throw error;
  }
}

export async function deleteUser(userId) {
  await connectDB();

  if (!mongoose.isValidObjectId(userId)) {
    return null;
  }

  return User.findByIdAndDelete(userId);
}