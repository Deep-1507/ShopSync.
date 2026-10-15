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
    return null;
  }

  const data = updateUserValidator.parse(body);

  const duplicateConditions = [];

  if (data.email) duplicateConditions.push({ email: data.email });
  if (data.phone) duplicateConditions.push({ phone: data.phone });

  if (duplicateConditions.length > 0) {
    const existingUser = await User.findOne({
      $and: [
        { _id: { $ne: userId } },
        { $or: duplicateConditions },
      ],
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
  }

  return User.findByIdAndUpdate(
    userId,
    { $set: data },
    { new: true, runValidators: true }
  );
}

export async function deleteUser(userId) {
  await connectDB();

  if (!mongoose.isValidObjectId(userId)) {
    return null;
  }

  return User.findByIdAndDelete(userId);
}