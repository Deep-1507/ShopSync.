import { NextResponse } from "next/server";
import { readUserByEmail } from "@/controllers/userController";
import { userAuthMiddleware } from "@/middlewares/userAuthMiddleware";
import { enterpriseAuthMiddleware } from "@/middlewares/enterpriseAuthMiddleware";

export async function GET(request) {
  try {
    const [userAuth, enterpriseAuth] = await Promise.all([
      userAuthMiddleware(request),
      enterpriseAuthMiddleware(request),
    ]);

    const userAuthenticated =
      !(userAuth instanceof NextResponse);

    const enterpriseAuthenticated =
      !(enterpriseAuth instanceof NextResponse);

    if (!userAuthenticated && !enterpriseAuthenticated) {
      return NextResponse.json(
        {
          success: false,
          message: "Authentication required",
        },
        { status: 401 }
      );
    }

    const email = new URL(request.url).searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          message: "Email query parameter is required",
        },
        { status: 400 }
      );
    }

    return await readUserByEmail(email);
  } catch (error) {
    console.error("Read user by email error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch user",
      },
      { status: 500 }
    );
  }
}