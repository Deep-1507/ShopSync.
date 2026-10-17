
import { NextResponse } from "next/server";
import {
  createOrder,
  createOrderByEnterprise,
  getOrders,
  getOrderById,
  getOrderByBillNumber,
  updateOrder,
  deleteOrder,
} from "../services/orderService";
import User from "../models/User";

function handleError(error) {
  console.error("Order API error:", error);

  return NextResponse.json(
    {
      success: false,
      message: error.message || "Internal server error",
    },
    { status: error.statusCode || 500 }
  );
}

export async function createOrderController(request, customerId) {
  try {
    const body = await request.json();
    const order = await createOrder(customerId, body);

    return NextResponse.json(
      {
        success: true,
        message: "Order created successfully",
        order,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleError(error);
  }
}

export async function createOrderControllerforEnterprise(request, enterpriseId) {
  try {
    const body = await request.json();

    const order = await createOrderByEnterprise(enterpriseId, body);

    return NextResponse.json(
      {
        success: true,
        message: "Order created successfully",
        order,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleError(error);
  }
}

export async function listOrdersController(filters, page, limit) {
  try {

  
    const result = await getOrders(filters, page, limit);
    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function getOrderController(id, actor) {
  try {
    const order = await getOrderById(id);

    const isCustomer =
      actor.userId &&
      String(order.customerId?._id ?? order.customerId) === actor.userId;

    const isEnterprise =
      actor.enterpriseId &&
      String(order.enterpriseId?._id ?? order.enterpriseId) ===
        actor.enterpriseId;

    if (!isCustomer && !isEnterprise) {
      return NextResponse.json(
        { success: false, message: "Access denied" },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true, order });
  } catch (error) {
    return handleError(error);
  }
}

export async function getOrderByBillController(billNumber, actor) {
  try {
    const order = await getOrderByBillNumber(billNumber);

    // const isCustomer =
    //   actor.userId &&
    //   String(order.customerId?._id ?? order.customerId) === actor.userId;

    // const isEnterprise =
    //   actor.enterpriseId &&
    //   String(order.enterpriseId?._id ?? order.enterpriseId) ===
    //     actor.enterpriseId;

    // if (!isCustomer && !isEnterprise) {
    //   return NextResponse.json(
    //     { success: false, message: "Access denied" },
    //     { status: 403 }
    //   );
    // }

    return NextResponse.json({ success: true, order });
  } catch (error) {
    return handleError(error);
  }
}

export async function updateOrderController(request, id) {
  try {
    const body = await request.json();
    const order = await updateOrder(id, body);

    return NextResponse.json({
      success: true,
      message: "Order updated successfully",
      order,
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function deleteOrderController(id, customerId) {
  try {
    await deleteOrder(id, customerId);

    return NextResponse.json({
      success: true,
      message: "Order deleted successfully",
    });
  } catch (error) {
    return handleError(error);
  }
}