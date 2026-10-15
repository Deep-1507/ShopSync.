import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { ZodError } from "zod";

import {
  registerEnterprise,
  authenticateEnterprise,
  getEnterpriseById,
  updateEnterprise,
  deleteEnterprise,
  searchEnterprises,
} from "../services/enterpriseService";

function publicEnterprise(enterprise) {
  const data = enterprise.toObject();
  delete data.password;
  return data;
}

function handleError(error) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        success: false,
        message: "Validation failed",
        errors: error.issues,
      },
      { status: 400 }
    );
  }

  return NextResponse.json(
    {
      success: false,
      message: error.message || "Internal server error",
    },
    { status: error.statusCode || 500 }
  );
}

function createToken(enterprise) {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }

  return jwt.sign(
    {
      enterpriseId: enterprise._id.toString(),
      email: enterprise.email,
    },
    secret,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

export async function signup(request) {
  try {
    const body = await request.json();
    const enterprise = await registerEnterprise(body);
    const token = createToken(enterprise);

    return NextResponse.json(
      {
        success: true,
        message: "Enterprise registered successfully",
        token,
        enterprise: publicEnterprise(enterprise),
      },
      { status: 201 }
    );
  } catch (error) {
    return handleError(error);
  }
}

export async function signin(request) {
  try {
    const body = await request.json();
    const enterprise = await authenticateEnterprise(body);
    const token = createToken(enterprise);

    return NextResponse.json({
      success: true,
      message: "Enterprise signed in successfully",
      token,
      enterprise: publicEnterprise(enterprise),
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function readEnterprise(enterpriseId, requesterId) {
  try {
    if (enterpriseId !== requesterId) {
      return NextResponse.json(
        { success: false, message: "Access denied" },
        { status: 403 }
      );
    }

    const enterprise = await getEnterpriseById(enterpriseId);

    return NextResponse.json({
      success: true,
      enterprise: publicEnterprise(enterprise),
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function editEnterprise(request, enterpriseId) {
  try {
    const body = await request.json();
    const enterprise = await updateEnterprise(enterpriseId, body);

    return NextResponse.json({
      success: true,
      message: "Enterprise updated successfully",
      enterprise: publicEnterprise(enterprise),
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function removeEnterprise(enterpriseId) {
  try {
    await deleteEnterprise(enterpriseId);

    return NextResponse.json({
      success: true,
      message: "Enterprise deleted successfully",
    });
  } catch (error) {
    return handleError(error);
  }
}


export async function getEnterpriseByIdController(id) {
  try {
    const enterprise = await getEnterpriseById(id);

    return NextResponse.json({
      success: true,
      enterprise,
    });
  } catch (error) {
    return handleError(error);
  }
}


export async function searchEnterprisesController(request) {
  try {
    const { searchParams } = new URL(request.url);

    const result = await searchEnterprises({
      name: searchParams.get("name") || undefined,
      enterpriseName:
        searchParams.get("enterpriseName") || undefined,
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