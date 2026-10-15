import { NextResponse } from "next/server";
import {userAuthMiddleware} from "../../../middlewares/userAuthMiddleware";
import {
  createOrderController,
  createOrderControllerforEnterprise,
  listOrdersController,
} from "../../../controllers/orderController";


export async function POST(request) {
    try {
        const authResult = await userAuthMiddleware(request);

        // Middleware returns a NextResponse when authentication fails
        if (authResult instanceof NextResponse) {
            return authResult;
        }

        // Middleware returns the decoded user data directly
        const { userId } = authResult;

        if (!userId) {
            return NextResponse.json(
                {
                    success: false,
                    message: "User ID missing from authentication token",
                },
                { status: 401 }
            );
        }

        console.log("Authenticated user ID:", userId);

        return await createOrderController(request, userId);
    } catch (error) {
        console.error("Create order API error:", error);

        return NextResponse.json(
            {
                success: false,
                message: "Failed to create order",
            },
            { status: 500 }
        );
    }
}

export async function GET(request) {
    try {
        const authResult = await userAuthMiddleware(request);

        if (authResult instanceof NextResponse) {
            return authResult;
        }

        const { userId } = authResult;

        if (!userId) {
            return NextResponse.json(
                {
                    success: false,
                    message: "User ID missing from authentication token",
                },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);

        const page = searchParams.get("page") || "1";
        const limit = searchParams.get("limit") || "10";

        return await listOrdersController(
            { customerId: userId },
            page,
            limit
        );
    } catch (error) {
        console.error("List orders API error:", error);

        return NextResponse.json(
            {
                success: false,
                message: "Failed to fetch orders",
            },
            { status: 500 }
        );
    }
}