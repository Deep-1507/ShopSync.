import { NextResponse } from "next/server";
import mongoose from "mongoose";

import {connectDB} from "../../../../lib/mongodb";
import Order from "@/models/Order";
import { userAuthMiddleware } from "../../../../middlewares/userAuthMiddleware";

export async function POST(request) {
  try {
    await connectDB();

    const authResult = await userAuthMiddleware(request);
    
        if (authResult instanceof NextResponse) {
          return authResult;
        }
    

    const { orderId, paymentType } = await request.json();
    console.log(orderId, paymentType)

    // Validate required fields
    if (!orderId) {
      return NextResponse.json(
        { success: false, message: "Order ID is required" },
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


    // Find order
    const order = await Order.findById(orderId);

    if (!order) {
      return NextResponse.json(
        { success: false, message: "Order not found" },
        { status: 404 }
      );
    }



    order.paymentType = paymentType;

    await order.save();

    return NextResponse.json({
      success: true,
      message: "Payment Type successfully.",
      order,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}