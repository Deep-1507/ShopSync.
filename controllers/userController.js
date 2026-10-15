
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { ZodError } from "zod";

import {
  registerUser,
  authenticateUser,
  getUserById,
  getUserByEmail,
  updateUser,
  deleteUser,
} from "../services/userService";

function handleError(error, operation) {
  if (error instanceof SyntaxError) {
    return NextResponse.json(
      { success: false, message: "Invalid JSON body" },
      { status: 400 }
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        success: false,
        message: "Validation failed",
        errors: error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 400 }
    );
  }

  if (error?.code === 11000) {
    return NextResponse.json(
      { success: false, message: "Email or phone already exists" },
      { status: 409 }
    );
  }

  if (error.statusCode) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: error.statusCode }
    );
  }

  if (error instanceof mongoose.Error.ValidationError) {
    return NextResponse.json(
      {
        success: false,
        message: "User validation failed",
        errors: Object.values(error.errors).map(
          (item) => item.message
        ),
      },
      { status: 400 }
    );
  }

  console.error(`${operation}:`, error);

  return NextResponse.json(
    { success: false, message: "Internal server error" },
    { status: 500 }
  );
}

function publicUser(user) {
  const data = user.toObject();
  delete data.password;
  return data;
}

function createToken(user) {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }

  return jwt.sign(
    {
      userId: user._id.toString(),
      email: user.email,
    },
    secret,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

function validateUserId(userId) {
  return mongoose.isValidObjectId(userId);
}

export async function signup(request) {
  try {
    const body = await request.json();
    const user = await registerUser(body);
    const token = createToken(user);


    return NextResponse.json(
      {
        success: true,
        message: "User registered successfully",
        token,
        data: publicUser(user),
      },
      { status: 201 }
    );
  } catch (error) {
    return handleError(error, "Signup error");
  }
}

export async function signin(request) {
  try {
    const body = await request.json();
    const user = await authenticateUser(body);
    const token = createToken(user);

    return NextResponse.json({
      success: true,
      message: "Signed in successfully",
      token,
      data: publicUser(user),
    });
  } catch (error) {
    return handleError(error, "Signin error");
  }
}

export async function readUser(userId, requesterId) {
  try {
    if (!validateUserId(userId) || !validateUserId(requesterId)) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // Users may only read their own profile.
    if (userId !== requesterId) {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 }
      );
    }

    const user = await getUserById(userId);

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: user,
    });
  } catch (error) {
    return handleError(error, "Read user error");
  }
}

export async function readUserByEmail(email) {
  try {
    if (typeof email !== "string" || !email.trim()) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    const user = await getUserByEmail(email);

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: user,
    });
  } catch (error) {
    return handleError(error, "Read user error");
  }
}

export async function editUser(request, userId) {
  try {
    if (!validateUserId(userId)) {
      return NextResponse.json(
        { success: false, message: "Invalid user ID" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const user = await updateUser(userId, body);

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      data: publicUser(user),
    });
  } catch (error) {
    return handleError(error, "Update user error");
  }
}

export async function removeUser(userId) {
  try {
    if (!validateUserId(userId)) {
      return NextResponse.json(
        { success: false, message: "Invalid user ID" },
        { status: 400 }
      );
    }

    const user = await deleteUser(userId);

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (error) {
    return handleError(error, "Delete user error");
  }
}