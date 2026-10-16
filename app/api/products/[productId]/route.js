import { NextResponse } from "next/server";
import { editProduct,removeProduct } from "@/controllers/productController";
import { enterpriseAuthMiddleware } from "@/middlewares/enterpriseAuthMiddleware";

export async function PATCH(request, { params }) {
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

    const { productId } = await params;
    console.log(productId)

    return await editProduct(request, productId, enterpriseId);
  } catch (error) {
    console.error("Update product API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update product",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
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

    const { productId } = await params;

    return await removeProduct(productId, enterpriseId);
  } catch (error) {
    console.error("Delete product API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete product",
      },
      { status: 500 }
    );
  }
}