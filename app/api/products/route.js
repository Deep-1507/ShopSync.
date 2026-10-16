import { NextResponse } from "next/server";
import { createProduct } from "@/controllers/productController";
import { enterpriseAuthMiddleware } from "@/middlewares/enterpriseAuthMiddleware";

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

    return await createProduct(request, enterpriseId);
  } catch (error) {
    console.error("Create product API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create product",
      },
      { status: 500 }
    );
  }
}