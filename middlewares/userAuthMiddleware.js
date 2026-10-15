import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

export function userAuthMiddleware(request) {
  try {
    const token =
      request.cookies.get("userToken")?.value ||
      request.headers
        .get("authorization")
        ?.replace(/^Bearer\s+/i, "");

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: "Authentication token is required",
        },
        { status: 401 }
      );
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    if (!decoded.userId || !decoded.email) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid user token payload",
        },
        { status: 401 }
      );
    }

    // Return the authenticated user details.
    return {
      userId: decoded.userId,
      email: decoded.email,
    };
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error.name === "TokenExpiredError"
            ? "Authentication token has expired"
            : "Invalid authentication token",
      },
      { status: 401 }
    );
  }
}