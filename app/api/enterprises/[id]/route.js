import { NextResponse } from "next/server";
import { getEnterpriseByIdController } from "@/controllers/enterpriseController";
import { userAuthMiddleware } from "@/middlewares/userAuthMiddleware";
import { enterpriseAuthMiddleware } from "@/middlewares/enterpriseAuthMiddleware";

export async function GET(request, { params }) {
  try {
    const [userAuth, enterpriseAuth] = await Promise.all([
      userAuthMiddleware(request),
      enterpriseAuthMiddleware(request),
    ]);

    const userAuthenticated = !(userAuth instanceof NextResponse);
    const enterpriseAuthenticated =
      !(enterpriseAuth instanceof NextResponse);

    // Continue if either authentication succeeds
    if (!userAuthenticated && !enterpriseAuthenticated) {
      return NextResponse.json(
        {
          success: false,
          message: "Authentication required",
        },
        { status: 401 }
      );
    }

    const { id } = await params;

    return await getEnterpriseByIdController(id);
  } catch (error) {
    console.error("Get enterprise by ID API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch enterprise",
      },
      { status: 500 }
    );
  }
}