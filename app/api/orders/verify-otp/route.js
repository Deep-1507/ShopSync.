import { NextResponse } from "next/server";
import mongoose from "mongoose";

import {connectDB} from "../../../../lib/mongodb";
import Order from "@/models/Order";
import { enterpriseAuthMiddleware } from "../../../../middlewares/enterpriseAuthMiddleware";

export async function POST(request) {
  try {
    await connectDB();

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

    const { orderId, otp } = await request.json();

    // Validate required fields
    if (!orderId || !otp) {
      return NextResponse.json(
        { success: false, message: "Order ID and OTP are required" },
        { status: 400 }
      );
    }

    // Validate order ID
    if (!mongoose.isValidObjectId(orderId)) {
      return NextResponse.json(
        { success: false, message: "Invalid order ID" },
        { status: 400 }
      );
    }

    // Validate OTP format
    if (!/^\d{4}$/.test(String(otp))) {
      return NextResponse.json(
        { success: false, message: "OTP must be a 4-digit number" },
        { status: 400 }
      );
    }

    // Find order
    const order = await Order.findById(orderId);

    if (!order) {
      return NextResponse.json(
        { success: false, message: "Order not found" },
        { status: 404 }
      );
    }

    // Verify OTP
    if (String(order.otp) !== String(otp)) {
      return NextResponse.json(
        { success: false, message: "Invalid OTP" },
        { status: 400 }
      );
    }

    // Update order and payment status
    order.orderStatus = "completed";
    order.paymentStatus = "paid";

    await order.save();

    return NextResponse.json({
      success: true,
      message: "OTP verified. Order completed successfully.",
      order,
    });
  } catch (error) {
    console.error("OTP verification error:", error);

    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}