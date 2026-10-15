
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { ZodError } from "zod";
import {
  registerProduct,
  getProducts,
  searchProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} from "../services/productService";

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
      {
        success: false,
        message: "A product with this SKU already exists",
      },
      { status: 409 }
    );
  }

  if (error instanceof mongoose.Error.ValidationError) {
    return NextResponse.json(
      {
        success: false,
        message: "Product validation failed",
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

function validateEnterpriseId(enterpriseId) {
  return mongoose.isValidObjectId(enterpriseId);
}

function invalidEnterpriseResponse() {
  return NextResponse.json(
    { success: false, message: "Invalid enterprise ID" },
    { status: 401 }
  );
}

function notFoundResponse() {
  return NextResponse.json(
    { success: false, message: "Product not found" },
    { status: 404 }
  );
}

export async function createProduct(request, enterpriseId) {
  try {
    if (!validateEnterpriseId(enterpriseId)) {
      return invalidEnterpriseResponse();
    }

    const body = await request.json();
    const product = await registerProduct(body, enterpriseId);

    return NextResponse.json(
      {
        success: true,
        message: "Product created successfully",
        data: product,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleError(error, "Create product error");
  }
}

export async function listProducts(enterpriseId) {
  try {
    console.log(enterpriseId)
    const products = await getProducts(enterpriseId);
    console.log("here",products)

    return NextResponse.json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (error) {
    return handleError(error, "List products error");
  }
}

export async function searchProductsController(request) {
  try {
    const { searchParams } = new URL(request.url);

    const result = await searchProducts({
      name: searchParams.get("name") || undefined,
      sku: searchParams.get("sku") || undefined,
      brand: searchParams.get("brand") || undefined,
      category: searchParams.get("category") || undefined,
      district: searchParams.get("district") || undefined,
      state: searchParams.get("state") || undefined,
      page: searchParams.get("page") || "1",
      limit: searchParams.get("limit") || "10",
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function readProduct(productId) {
  try {

    if (!mongoose.isValidObjectId(productId)) {
      return notFoundResponse();
    }
    console.log(productId)
    const product = await getProductById(productId);
    console.log(product)
    if (!product) {
      return notFoundResponse();
    }

    return NextResponse.json({
      success: true,
      data: product,
    });
  } catch (error) {
    return handleError(error, "Read product error");
  }
}

export async function editProduct(request, productId, enterpriseId) {
  try {
    if (!validateEnterpriseId(enterpriseId)) {
      return invalidEnterpriseResponse();
    }

    if (!mongoose.isValidObjectId(productId)) {
      return notFoundResponse();
    }

    const body = await request.json();
    const product = await updateProduct(
      productId,
      enterpriseId,
      body
    );

    if (!product) {
      return notFoundResponse();
    }

    return NextResponse.json({
      success: true,
      message: "Product updated successfully",
      data: product,
    });
  } catch (error) {
    return handleError(error, "Update product error");
  }
}

export async function removeProduct(productId, enterpriseId) {
  try {
    if (!validateEnterpriseId(enterpriseId)) {
      return invalidEnterpriseResponse();
    }

    if (!mongoose.isValidObjectId(productId)) {
      return notFoundResponse();
    }

    const product = await deleteProduct(productId, enterpriseId);

    if (!product) {
      return notFoundResponse();
    }

    return NextResponse.json({
      success: true,
      message: "Product deleted successfully",
      data: { id: product._id },
    });
  } catch (error) {
    return handleError(error, "Delete product error");
  }
}
