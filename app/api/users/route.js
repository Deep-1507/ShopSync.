import { NextResponse } from "next/server";
import {
  readUser,
  editUser,
  removeUser,
} from "@/controllers/userController";
import { userAuthMiddleware } from "@/middlewares/userAuthMiddleware";

// GET: Read authenticated user's profile
export async function GET(request) {
  try {
    const auth = await userAuthMiddleware(request);

    if (auth instanceof NextResponse) {
      return auth;
    }

    const { userId } = auth;

    return await readUser(userId, userId);
  } catch (error) {
    console.error("Read user route error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to fetch user profile" },
      { status: 500 }
    );
  }
}

// PATCH: Update authenticated user's profile
export async function PATCH(request) {
  try {
    const auth = await userAuthMiddleware(request);

    if (auth instanceof NextResponse) {
      return auth;
    }

    const { userId } = auth;

    return await editUser(request, userId);
  } catch (error) {
    console.error("Update user route error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to update user profile" },
      { status: 500 }
    );
  }
}

// DELETE: Delete authenticated user's account
export async function DELETE(request) {
  try {
    const auth = await userAuthMiddleware(request);

    if (auth instanceof NextResponse) {
      return auth;
    }

    const { userId } = auth;

    return await removeUser(userId);
  } catch (error) {
    console.error("Delete user route error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to delete user account" },
      { status: 500 }
    );
  }
}