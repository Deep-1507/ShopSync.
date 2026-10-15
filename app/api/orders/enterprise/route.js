import { NextResponse } from "next/server";
import {enterpriseAuthMiddleware} from "../../../../middlewares/enterpriseAuthMiddleware";
import {
  createOrderControllerforEnterprise
} from "../../../../controllers/orderController";

export async function POST(request) {

  const { user, response } = await enterpriseAuthMiddleware(request);
  if (response) return response;

  return createOrderControllerforEnterprise(request, user.enterpriseId);
}