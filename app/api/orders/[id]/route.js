import { NextResponse } from "next/server";
import { connectDB } from "../../../../lib/mongodb";
import Order from "@/models/Order";
import { userAuthMiddleware } from "../../../../middlewares/userAuthMiddleware";
import { enterpriseAuthMiddleware } from "../../../../middlewares/enterpriseAuthMiddleware";
import {
  getOrderController,
  updateOrderController,
  deleteOrderController,
} from "../../../../controllers/orderController";

const ALLOWED_ORDER_STATUSES = [
  "placed",
  "confirmed",
  "processing",
  "completed",
  "cancelled",
];

const ALLOWED_PAYMENT_STATUSES = [
  "pending",
  "partially_paid",
  "paid",
  "failed",
  "refunded",
];

export async function GET(request, { params }) {
  const { id } = await params;

  const customerAuth = await authMiddleware(request);

  if (!customerAuth.response) {
    return getOrderController(id, { userId: customerAuth.user.userId });
  }

  const enterpriseAuth = await enterpriseAuthMiddleware(request);

  if (!enterpriseAuth.response) {
    return getOrderController(id, {
      enterpriseId: enterpriseAuth.user.enterpriseId,
    });
  }

  return customerAuth.response;
}

export async function PATCH(request, { params }) {
  try {
    await connectDB();

    // 1. Authenticate the enterprise using your middleware
    const authResult = await enterpriseAuthMiddleware(request);

    if (!authResult || authResult.error) {
      return NextResponse.json(
        { success: false, message: "Unauthorized access" },
        { status: 401 }
      );
    }

    // Adjust this property to match the enterprise ID exposed by your middleware.
    const enterpriseId =
      authResult.enterprise?._id ||
      authResult.enterpriseId ||
      authResult.user?.enterpriseId;

    console.log(enterpriseId)

    if (!enterpriseId) {
      return NextResponse.json(
        { success: false, message: "Enterprise ID not found in token" },
        { status: 401 }
      );
    }

    // 2. Get the order ID from the URL
    const { id } = await params;
    const orderId = id;

    console.log(orderId)

    // 3. Read the requested changes
    const body = await request.json();
    const { orderStatus, paymentStatus } = body;

    // 4. Require at least one supported field
    if (orderStatus === undefined && paymentStatus === undefined) {
      return NextResponse.json(
        {
          success: false,
          message: "Provide orderStatus or paymentStatus",
        },
        { status: 400 }
      );
    }

    // 5. Validate the requested status values
    if (
      orderStatus !== undefined &&
      !ALLOWED_ORDER_STATUSES.includes(orderStatus)
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid orderStatus" },
        { status: 400 }
      );
    }

    if (
      paymentStatus !== undefined &&
      !ALLOWED_PAYMENT_STATUSES.includes(paymentStatus)
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid paymentStatus" },
        { status: 400 }
      );
    }


    // 6. Find the order AND verify enterprise ownership
    const order = await Order.findOne({
      _id: orderId
    });

    
    if (!order) {
      return NextResponse.json(
        {
          success: false,
          message: "Order not found",
        },
        { status: 404 }
      );
    }

    if (order.enterpriseId.toString() != enterpriseId) {
      return NextResponse.json(
        {
          success: false,
          message: "You are not authorized to update it",
        },
        { status: 404 }
      );
    }



    // 7. Apply only the fields provided by the request
    if (orderStatus !== undefined) {
      order.orderStatus = orderStatus;
    }

    if (paymentStatus !== undefined) {
      order.paymentStatus = paymentStatus;
    }

    await order.save();

    // 8. Return the updated order
    return NextResponse.json(
      {
        success: true,
        message: "Order updated successfully",
        order,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Update order error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update order",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  const { user, response } = await authMiddleware(request);
  if (response) return response;

  const { id } = await params;

  return deleteOrderController(id, user.userId);
}