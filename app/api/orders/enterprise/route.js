import { NextResponse } from "next/server";
import { enterpriseAuthMiddleware } from "../../../../middlewares/enterpriseAuthMiddleware";
import { createOrderControllerforEnterprise } from "../../../../controllers/orderController";

export async function POST(request) {
  try {
    const authResult = await enterpriseAuthMiddleware(request);

    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { enterpriseId } = authResult;

    if (!enterpriseId) {
      return NextResponse.json(
        {
          success: false,
          message: "Enterprise ID missing from authentication token",
        },
        { status: 401 }
      );
    }

    return await createOrderControllerforEnterprise(request, enterpriseId);
  } catch (error) {
    console.error("Create enterprise order API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create enterprise order",
      },
      { status: 500 }
    );
  }
}