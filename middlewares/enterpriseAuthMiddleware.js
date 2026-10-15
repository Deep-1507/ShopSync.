import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

export function enterpriseAuthMiddleware(request) {
  try {
    const token =
      request.cookies.get("enterpriseToken")?.value ||
      request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

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

    if (!decoded.enterpriseId || !decoded.email) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid enterprise token payload",
        },
        { status: 401 }
      );
    }

    // Return the authenticated enterprise details.
    return {
      enterpriseId: decoded.enterpriseId,
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