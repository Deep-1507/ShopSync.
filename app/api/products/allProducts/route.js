import { NextResponse } from "next/server";
import {
  searchProductsController,
  createProduct,
  listProducts
} from "@/controllers/productController";
import { enterpriseAuthMiddleware } from "@/middlewares/enterpriseAuthMiddleware";

export async function GET(request) {
  return searchProductsController(request);
}

export async function POST(request) {
  try {
    const enterpriseAuth = await enterpriseAuthMiddleware(request);

    if (enterpriseAuth instanceof NextResponse) {
      return enterpriseAuth;
    }

    const { enterpriseId } = enterpriseAuth;

    return await createProduct(request, enterpriseId);
  } catch (error) {
    console.error("Create product route error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create product",
      },
      { status: 500 }
    );
  }
}