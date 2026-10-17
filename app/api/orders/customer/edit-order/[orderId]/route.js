import { NextResponse } from "next/server";
import mongoose from "mongoose";
import {connectDB} from "../../../../../../lib/mongodb";
import Order from "../../../../../../models/Order";
import {userAuthMiddleware} from "../../../../../../middlewares/userAuthMiddleware";

export async function PATCH(request, { params }) {
    try {
        await connectDB();

        const auth = await userAuthMiddleware(request);

        console.log(auth)

        // if (!auth?.success) {
        //     return NextResponse.json(
        //         { success: false, message: auth?.message || "Unauthorized" },
        //         { status: 401 }
        //     );
        // }

        // Match this with the user ID returned by your middleware
        const userId = auth.user?._id || auth.userId;

        if (!userId) {
            return NextResponse.json(
                { success: false, message: "User ID not found" },
                { status: 401 }
            );
        }

        const { orderId } = await params;

        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            return NextResponse.json(
                { success: false, message: "Invalid order ID" },
                { status: 400 }
            );
        }

        const { products } = await request.json();

        if (!Array.isArray(products) || products.length === 0) {
            return NextResponse.json(
                { success: false, message: "Products must be a non-empty array" },
                { status: 400 }
            );
        }

        const order = await Order.findOne({
            _id: orderId,
            customerId: userId,
        });

        if (!order) {
            return NextResponse.json(
                { success: false, message: "Order not found" },
                { status: 404 }
            );
        }

        if (order.orderStatus !== "placed") {
            return NextResponse.json(
                {
                    success: false,
                    message: "Only placed orders can be edited",
                },
                { status: 400 }
            );
        }

        // Update ONLY the products array
        order.products = products;

        await order.save();

        return NextResponse.json(
            {
                success: true,
                message: "Order products updated successfully",
                products: order.products,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("Update order products error:", error);

        return NextResponse.json(
            {
                success: false,
                message: "Failed to update order products",
            },
            { status: 500 }
        );
    }
}

export async function DELETE(request, { params }) {
    try {
        await connectDB();

        const auth = await userAuthMiddleware(request);

        // if (!auth?.success) {
        //     return NextResponse.json(
        //         {
        //             success: false,
        //             message: auth?.message || "Unauthorized",
        //         },
        //         { status: 401 }
        //     );
        // }

        const userId = auth.user?._id || auth.userId;

        if (!userId) {
            return NextResponse.json(
                { success: false, message: "User ID not found" },
                { status: 401 }
            );
        }

        const { orderId } = await params;

        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            return NextResponse.json(
                { success: false, message: "Invalid order ID" },
                { status: 400 }
            );
        }

        const deletedOrder = await Order.findOneAndDelete({
            _id: orderId,
            customerId: userId,
        });

        if (!deletedOrder) {
            return NextResponse.json(
                { success: false, message: "Order not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(
            {
                success: true,
                message: "Order deleted successfully",
                orderId: deletedOrder._id,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("Delete order error:", error);

        return NextResponse.json(
            {
                success: false,
                message: "Failed to delete order",
            },
            { status: 500 }
        );
    }
}